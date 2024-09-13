# DOM Drag & Drop

This is a simple drag / drop mechanism that plays nice with React.

We aren't using EUI or another library, due to the fact that Lens visualizations and datasources may or may not be written in React. Even visualizations which are written in React will end up having their own ReactDOM.render call, and in that sense will be a standalone React application. We want to enable drag / drop across React and native DOM boundaries.

## Getting started

First, place a RootDragDropProvider at the root of your application.

```js
<RootDragDropProvider customMiddleware={...}>
  ... your app here ...
</RootDragDropProvider>
```

If you have a child React application (e.g. a visualization), you will need to pass the drag / drop context down into it. This can be obtained like so:

```js
const context = useDragDropContext();
```

In your child application, place a `ChildDragDropProvider` at the root of that, and assign the context into it:

```js
<ChildDragDropProvider value={context}>... your child app here ...</ChildDragDropProvider>
```

This enables your child application to share the same drag / drop context as the root application.

## DragDropIdentifier

An item can be both draggable and droppable at the same time, but for simplicity's sake, we'll treat these two cases separately.

To enable dragging an item, use `Draggable` with a `value` attribute. Property `value` has to be of a type object with a unique `id` property.

```js
<div className="field-list">
  {fields.map((f) => (
    <Draggable key={f.id} className="field-list-item" value={f}>
      {f.name}
    </Draggable>
  ))}
</div>
```

## Dropping

To enable dropping, use `Droppable` with both a `dropTypes` attribute that should be an array with at least one value and an `onDrop` handler attribute. `dropType` should only be truthy if is an item being dragged, and if a drop of the dragged item is supported.

```js
const [ dndState ] = useDragDropContext()

return (
  <Droppable
    className="axis"
    dropTypes=['truthyValue']
    onDrop={(item) => onChange([...items, item])}
  >
    {items.map((x) => (
      <div>{x.name}</div>
    ))}
  </Droppable>
);
```

### Reordering

To create a reordering group, the elements has to be surrounded with a `ReorderProvider`. They also need to be surrounded with draggable and droppable at the same time.

```js
<ReorderProvider>... elements from one group here ...</ReorderProvider>
```

The children `Draggable`/`Droppable` components must have props defined as in the example:

```js
<ReorderProvider>
  <div className="field-list">
    {fields.map((f) => (
      <Draggable
        key={f.id}
        dragType="move"
        value={{
          id: f.id,
          humanData: {
            label: 'Label'
          }
        }}
        >
        <Droppable
          dropTypes={["reorder"]} // generally shouldn't be set until a drag operation has started
          reorderableGroup={fields} // consists all reorderable elements in the group, eg. [{id:'3'}, {id:'5'}, {id:'1'}]
          value={{
            id: f.id,
            humanData: {
              label: 'Label'
            }
          }}
          onDrop={/*handler*/}
        >
          {f.name}
        </Droppable>
      </Draggable>
    ))}
  </div>
</ReorderProvider>
```
