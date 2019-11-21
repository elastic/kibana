# Inspector

The inspector is a contextual tool to gain insights into different elements
in Kibana, e.g. visualizations. It has the form of a flyout panel.

## Inspector Views

The "Inspector Panel" can have multiple so called "Inspector Views" inside of it.
These views are used to gain different information into the element you are inspecting.
There is a request inspector view to gain information in the requests done for this
element or a data inspector view to inspect the underlying data. Whether or not
a specific view is available depends on the used adapters.

## Inspector Adapters

Since the Inspector panel itself is not tied to a specific type of elements (visualizations,
saved searches, etc.), everything you need to open the inspector is a collection
of so called inspector adapters. A single adapter can be any type of JavaScript class.

Most likely an adapter offers some kind of logging capabilities for the element, that
uses it e.g. the request adapter allows element (like visualizations) to log requests
they make.

The corresponding inspector view will then use the information inside the adapter
to present the data in the panel. That concept allows different types of elements
to use the Inspector panel, while they can use completely or partial different adapters
and inspector views than other elements.

For example a visualization could provide the request and data adapter while a saved
search could only provide the request adapter and a Vega visualization could additionally
provide a Vega adapter.

There is no 1 to 1 relationship between adapters and views. An adapter could be used
by multiple views and a view can use data from multiple adapters. It's up to the
view to decide whether or not it wants to be shown for a given adapters list.

## Develop custom inspectors

You can extend the inspector panel by adding custom inspector views and inspector
adapters via a plugin.

### Develop inspector views

To develop custom inspector views you can define your
inspector view as follows:

```js
import React from 'react';

function MyInspectorComponent(props) {
  // props.adapters is the object of all adapters and may vary depending
  // on who and where this inspector was opened. You should check for all
  // adapters you need, in the below shouldShow method, before accessing
  // them here.
  return (
    <>
      My custom view....
    </>
  );
}

const MyLittleInspectorView = {
  // Title shown to select this view
  title: 'Display Name',
  // An icon id from the EUI icon list
  icon: 'iconName',
  // An order to sort the views (lower means first)
  order: 10,
  // An additional helptext, that wil
  help: `And additional help text, that will be shown in the inspector help.`,
  shouldShow(adapters) {
    // Only show if `someAdapter` is available. Make sure to check for
    // all adapters that you want to access in your view later on and
    // any additional condition you want to be true to be shown.
    return adapters.someAdapter;
  },
  // A React component, that will be used for rendering
  component: MyInspectorComponent
};
```

Then register your view in *setup* life-cycle with `inspector` plugin.

```ts
class MyPlugin extends Plugin {
  setup(core, { inspector }) {
    inspector.registerView(MyLittleInspectorView);
  }
}
```

### Develop custom adapters

An inspector adapter is just a plain JavaScript class, that can e.g. be attached
to custom visualization types, so an inspector view can show additional information for this
visualization.

To add additional adapters to your visualization type, use the `inspectorAdapters.custom`
object when defining the visualization type:

```js
class MyCustomInspectorAdapter {
  // ....
}

// inside your visualization type description (usually passed to VisFactory.create...Type)
{
  // ...
  inspectorAdapters: {
    custom: {
      someAdapter: MyCustomInspectorAdapter
    }
  }
}
```

Custom inspector views can now check for the presence of `adapters.someAdapter`
in their `shouldShow` method and use this adapter in their component.
