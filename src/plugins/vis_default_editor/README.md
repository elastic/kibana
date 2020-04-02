# Visualization Deafult Editor plugin

The default editor is used as visualize sidebar in most primary visualizations, e.x. `Area`, `Data table`, `Pie`, etc.
The plugun exposes the static `DefaultEditorController` class to consume.

```ts
import { DefaultEditorController } from '../../vis_default_editor/public';

const editor = new DefaultEditorController(
  element,
  vis,
  eventEmitter,
  embeddableHandler
);
```