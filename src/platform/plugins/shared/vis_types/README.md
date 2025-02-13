# Vis types

This folder contains all the legacy visualizations plugins. The legacy visualizations are:
- TSVB
- Vega
- All the aggregation-based visualizations

The structure is:
```
  └ vis_types (just a folder)

    └ pie (previous vis_type_pie)

    └ tagcloud (previous vis_type_tagcloud)

    └ ...
```

 If their renderer/expression is not shared with any other plugin, it can be contained within the vis_types/* plugin in this folder. If it's sharing a renderer/expression with Lens or Canvas, the renderer must be extracted into the chart_expression folder.
