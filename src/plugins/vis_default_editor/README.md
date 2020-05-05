# Visualization Deafult Editor plugin

The default editor is used in most primary visualizations, e.x. `Area`, `Data table`, `Pie`, etc.
It acts as a container for a particular visualization and options tabs. Contains the default "Data" tab in `public/components/sidebar/data_tab.tsx`.
The plugin exposes the static `DefaultEditorController` class to consume.

```ts
import { DefaultEditorController } from '../../vis_default_editor/public';

const editor = new DefaultEditorController(
  element,
  vis,
  eventEmitter,
  embeddableHandler
);
```