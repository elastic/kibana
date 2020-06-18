## Input and output state

### What's the difference?

Input vs Output State

| Input          | Output |
| -----------     | ----------- |
| Public, on the IEmbeddable interface. `embeddable.updateInput(changedInput)`   | Protected inside the Embeddable class. `this.updateOutput(changedOutput)`      |
|  Serializable representation of the embeddable  | Does not need to be serializable                 |
|  Can be updated throughout the lifecycle of an Embeddable  | Often derived from input state        |

Non-real examples to showcase the difference:

| Input          | Output      |
| -----------    | ----------- |
| savedObjectId  |     savedObjectAttributes  |
| esQueryRequest |     esQueryResponse        |
|   props        |     renderComplete         |

### Types of input state

**Inherited input state**

The only reason we have different types of input state is to support embeddable containers, and children embeddables _inheriting_ state from the container. 
For example, when the dashboard time range changes, so does
the time range of all children embeddables. Dashboard passes down time range as _inherited_ input state. From the viewpoint of the child Embeddable,
time range is just input state. It doesn't care where it gets this data from.  


For example, imagine a container with this input:

```js
{
  gridData: {...},
  timeRange: 'now-15m to now',

  // Every embeddable container has a panels mapping. It's how the base container class manages common changes like children being
  // added, removed or edited.
  panels: {
    ['1']: {
      // `type` is used to grab the right embeddable factory. Every PanelState must specify one.
      type: 'clock',

      // `explicitInput` is combined with `inheritedInput` to create `childInput`, and is use like:
      // `embeddableFactories.get(type).create(childInput)`.
      explicitInput: {

        // All explicitInput is required to have an id. I'm not actually sure it's neccessary. I believe it was intended as a way for the
        // embeddable to know where it exists in the panels array if it's living in a container. This could possibly be tech debt and
        // removed. Note though, this is NOT THE SAVED OBJECT ID! Even though it's sometimes used to store the saved object id. 
        id: '1',
      }
    }
  }
}
```

That could result in the following input being passed to a child:

```js
{
  timeRange: 'now-15m to now',
  id: '1',
}
```

Notice that `gridData` is not passed down, but `timeRange` is. What ends up as _inherited_ state, that is passed down to a child, is up to the specific
implementation of a container and
determined by the abstract function `Container.getInheritedInput()`

**Overridding inherited input**

We wanted to support _overriding_ this inherited state, to support the "Per panel time range" feature. The _inherited_ `timeRange` input can be
overridden by the _explicit_ `timeRange` input.

Take this example dashboard container input:

```js
{
  gridData: {...},
  timeRange: 'now-15m to now',
  panels: {
    ['1']: {
      type: 'clock',
      explicitInput: {
        timeRange: 'now-30m to now',
        id: '1',
      }
    },
    ['2']: {
      type: 'clock',
      explicitInput: {
        id: '2',
      }
    },
}
```

The first child embeddable will get passed input state:

```js
{
  timeRange: 'now-30m to now',
  id: '1',
}
```

This override wouldn't affect other children, so the second child would receive:

```js
{
  timeRange: 'now-15m to now',
  id: '2',
}
```

**A container can pass down any information to the children**

It doesn't have to be part of it's own input. It's possible for a container input like:


```js
{
  timeRange: 'now-15m to now',
  panels: {
    ['1']: {
      type: 'clock',
      explicitInput: {
        timeRange: 'now-30m to now',
        id: '1',
      }
    }
}
```

to pass down this input:

```js
{
  timeRange: 'now-30m to now',
  id: '1',
  zed: 'bar', // <-- Where did this come from??
}
```

I don't have a realistic use case for this, just noting it's possible in any containers implementation of `getInheritedInput`. Note this is still considered
inherited input because it's coming from the container.

**Explicit input stored on behalf of the container**

It's possible for a container to store explicit input state on behalf of an embeddable, without knowing what that state is. For example, a container could
have input state like:

```js
{
  timeRange: 'now-15m to now',
  panels: {
    ['1']: {
      type: 'clock',
      explicitInput: {
        display: 'analog',
        id: '1',
      }
    }
}
```

And what gets passed to the child is:

```js
{
  timeRange: 'now-15m to now',
  id: '1',
  display: 'analog'
}
```

even if a container has no idea about this `clock` embeddable implementation, nor this `explicitInput.display` field.

There are two ways for this kind of state to end up in `panels[id].explicitInput`. 

1. `ClockEmbeddableFactory.getExplicitInput` returns it. 
2. `ClockEmbeddableFactory.getDefaultInput` returns it. (This function is largely unused. We may be able to get rid of it.)
3. Someone called `embeddable.updateInput({ display: 'analog' })`, when the embeddable is a child in a container. 

**Containers can pass down too much information**

Lets say our container state is:

```js
{
  timeRange: 'now-15m to now',
  panels: {
    ['1']: {
      type: 'helloWorld',
      explicitInput: {
        id: '1',
      }
    }
}
```

What gets passed to the child is:

```js
{
  timeRange: 'now-15m to now',
  id: '1',
}
```

It doesn't matter if the embeddable does not require, nor use, `timeRange`. The container passes down inherited input state to every child. 
This could present problems with trying to figure out which embeddables support
different types of actions. For example, it'd be great if "Customize time range" action only showed up on embeddables that actually did something
with the `timeRange`. You can't check at runtime whether `input.timeRange === undefined` to do so though, because it will be passed in by the container
regardless.

**Tech debt warning**

`EmbeddableFactory.getExplicitInput` was intended as a way for an embeddable to retrieve input state it needs, that will not  
be provided by a container. However, an embeddable won't know where it will be rendered, so how will the factory know which 
required data to ask from the user and which will be inherited from the container? I believe `getDefaultInput` was meant to solve this.
`getDefaultInput` would provide default values, only if the container didn't supply them through inheritance.  Explicit input would
always provide these values, and would always be stored in a containers `panel[id].explicitInput`, even if the container _did_ provide
them.

There are no real life examples showcasing this, it may not even be really needed by current use cases. Containers were built as an abstraction, with
the thinking being that it would support any type of rendering of child embeddables - whether in a "snap to grid" style like dashboard,
or in a free form layout like canvas.

The only real implementation of a container in production code at the time this is written is Dashboard however, with no plans to migrate
Canvas over to use it (this was the original impetus for an abstraction). The container code is quite complicated with child management, 
so it makes creating a new container very easy, as you can see in the developer examples of containers. But, it's possible this layer was
 an over abstraction without a real prod use case (I can say that because I wrote it, I'm only insulting myself!) :).

Be sure to read [Common mistakes with embeddable containers and inherited input state](./containers_and_inherited_state.md) next!