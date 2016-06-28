Leaflet.heat
==========

A tiny, simple and fast [Leaflet](http://leafletjs.com) heatmap plugin.
Uses [simpleheat](https://github.com/mourner/simpleheat) under the hood,
additionally clustering points into a grid for performance.


## Demos

- [10,000 points &rarr;](http://leaflet.github.io/Leaflet.heat/demo)
- [Adding points dynamically &rarr;](http://leaflet.github.io/Leaflet.heat/demo/draw.html)


## Basic Usage

```js
var heat = L.heatLayer(latlngs, {radius: 25}).addTo(map);
```

To include the plugin, just use `leaflet-heat.js` from the `dist` folder:

```html
<script src="leaflet-heat.js"></script>
```

## Building
To build the dist files run:
```npm install && npm run prepublish```


## Reference

#### L.heatLayer(latlngs, options)

Constructs a heatmap layer given an array of `LatLng` points and an object with the following options:
- **minOpacity** - the minimum opacity the heat will start at
- **maxZoom** - zoom level where the points reach maximum intensity (as intensity scales with zoom),
  equals `maxZoom` of the map by default
- **max** - maximum point intensity, `1.0` by default
- **radius** - radius of each "point" of the heatmap, `25` by default
- **blur** - amount of blur, `15` by default
- **gradient** - color gradient config, e.g. `{0.4: 'blue', 0.65: 'lime', 1: 'red'}`

Optional third argument in each `LatLng` point (`altitude`) represents point intensity.

#### Methods

- **setOptions(options)**: Sets new heatmap options and redraws it.
- **addLatLng(latlng)**: Adds a new point to the heatmap and redraws it.
- **setLatLngs(latlngs)**: Resets heatmap data and redraws it.
- **redraw()**: Redraws the heatmap.

## Changelog

#### 0.1.2 &mdash; Nov 5, 2014

- Added compatibility with Leaflet 0.8-dev.

#### 0.1.1 &mdash; Apr 22, 2014

- Fixed overlaying two heatmaps on top of each other.
- Fixed rare animation issues.

#### 0.1.0 &mdash; Feb 3, 2014

- Added `addLatLng`, `setLatlngs`, `setOptions` and `redraw` methods.
- Added `max` option and support for different point intensity values (through `LatLng` third argument).
- Added `gradient` option to customize colors.

#### 0.0.1 &mdash; Jan 31, 2014

- Initial release.

