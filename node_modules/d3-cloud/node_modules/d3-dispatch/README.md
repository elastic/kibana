# d3-dispatch

Dispatching is a convenient mechanism for separating concerns with loosely-coupled code: register named callbacks and then call them with arbitrary arguments. A variety of D3 components, such as [d3-request](https://github.com/d3/d3-request), use this mechanism to emit events to listeners. Think of this like Node’s [EventEmitter](https://nodejs.org/api/events.html), except every listener has a well-defined name so it’s easy to remove or replace them.

For example, to create a dispatch for *start* and *end* events:

```js
var dispatch = d3.dispatch("start", "end");
```

You can then register callbacks for these events using [*dispatch*.on](#dispatch_on):

```js
dispatch.on("start", callback1);
dispatch.on("start.foo", callback2);
dispatch.on("end", callback3);
```

Then, you can dispatch a *start* event using [*dispatch*.*type*](#dispatch_type):

```js
dispatch.start("pass arguments to callbacks here");
```

Want a more involved example? See how to use [d3-dispatch for coordinated views](http://bl.ocks.org/mbostock/5872848).

## Installing

If you use NPM, `npm install d3-dispatch`. Otherwise, download the [latest release](https://github.com/d3/d3-dispatch/releases/latest). The released bundle supports AMD, CommonJS, and vanilla environments. Create a custom build using [Rollup](https://github.com/rollup/rollup) or your preferred bundler. You can also load directly from [d3js.org](https://d3js.org):

```html
<script src="https://d3js.org/d3-dispatch.v0.2.min.js"></script>
```

In a vanilla environment, a `d3_dispatch` global is exported. [Try d3-dispatch in your browser.](https://tonicdev.com/npm/d3-dispatch)

## API Reference

<a name="dispatch" href="#dispatch">#</a> d3.<b>dispatch</b>(<i>types…</i>)

Creates a new dispatch for the specified event *types*. Each *type* is a string, such as `"start"` or `"end"`; for each type, [a method](#dispatch_type) is exposed on the returned dispatch for invoking the callbacks of that type.

<a name="dispatch_on" href="#dispatch_on">#</a> *dispatch*.<b>on</b>(<i>name</i>[, <i>callback</i>])

Adds, removes or gets a *callback* of the specified *name*.

The *name* is a string, such as `"start"` or `"end"`. A name consists of a event type optionally followed by a period (“.”) and a namespace; the optional namespace allows multiple callbacks to be registered to receive events of the same type, such as `"start.foo"` and `"start.bar"`. You can remove all callbacks for the namespace “foo” by saying `dispatch.on(".foo", null)`.

If a *callback* function is specified, it is registered for the specified (fully-qualified) *name*. If a callback was already registered for the same name, the existing callback is removed before the new callback is added. If *callback* is not specified, returns the current callback for the specified *name*, if any. The specified *callback* is invoked with the context and arguments specified by the caller; see [*dispatch*.*type*](#dispatch_type).

<a name="dispatch_type" href="#dispatch_type">#</a> *dispatch*.<b>*type*</b>(<i>arguments…</i>)

The *type* method (such as `dispatch.start` for the *start* event) invokes each registered callback for the given type, passing the callback the specified *arguments*. The `this` context will be used as the context of the registered callbacks.

For example, if you wanted to dispatch your *custom* callbacks after handling a native *click* event, while preserving the current `this` context and arguments, you could say:

```js
selection.on("click", function() {
  dispatch.custom.apply(this, arguments);
});
```

You can pass whatever arguments you want to callbacks; most commonly, you might create an object that represents an event, or pass the current datum (*d*) and index (*i*). See [function.call](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/Call) and [function.apply](https://developer.mozilla.org/en/JavaScript/Reference/Global_Objects/Function/Apply) for further information.
