# Vislib general overview

`vis.js` constructor accepts vis parameters and render method accepts data. it exposes event emitter interface so we can listen to certain events like 'renderComplete'.

`vis.render` will create 'lib/vis_config' to handle configuration (applying defaults etc) and then create 'lib/handler' which will take the work over.

`vis/handler` will init all parts of the chart (based on visualization type) and call render method on each of the building blocks.

## Visualizations

Each base vis type (`lib/types`) can have a different layout defined (`lib/layout`) and different building blocks (pie charts dont have axes for example)

All base visualizations extend from `visualizations/_chart`

### Pie chart

### Map

### Point series chart

`visualizations/point_series` takes care of drawing the point series chart (no axes or titles, just the chart itself). It creates all the series defined and calls render method on them.

currently there are 3 series types available (line, area, bars), they all extend from `visualizations/point_series/_point_series`.

