# Palette Service

The `palette` service offers a collection of palettes which implement a uniform interface for assigning colors to charts. The service provides methods for switching palettes
easily. It's used by the x-pack plugins `canvas` and `lens`.

Each palette is allowed to store some state as well which has to be handled by the consumer.

Palettes are integrated with the expression as well using the `system_palette` and `palette` functions.

## Using the palette service

To consume the palette service, use `charts.palettes.getPalettes` to lazily load the async bundle implementing existing palettes. This is recommended to be called in the renderer, not as part of the `setup` or `start` phases of a plugin.

All palette definitions can be loaded using `paletteService.getAll()`. If the id of the palette is known, it can be fetched using `paleteService.get(id)`.

One a palette is loaded, there are two ways to request colors - either by fetching a list of colors (`getColors`) or by specifying the chart object to be colored (`getColor`). If possible, using `getColor` is recommended because it allows the palette implementation to apply custom logic to coloring (e.g. lightening up colors or syncing colors) which has to be implemented by the consumer if `getColors` is used).

### SeriesLayer

If `getColor` is used, an array of `SeriesLayer` objects has to be passed in. These correspond with the current series in the chart a color has to be determined for. An array is necessary as some charts are constructed hierarchically (e.g. pie charts or treemaps). The array of objects represents the current series with all ancestors up to the corresponding root series. For each layer in the series hierarchy, the number of "sibling" series and the position of the current series has to be specified along with the name of the series.

## Custom palette

All palettes are stateless and define their own colors except for the `custom` palette which takes a state of the form
```ts
{ colors: string[]; gradient: boolean }
```

This state has to be passed into the `getColors` and `getColor` function to retrieve specific colors.

## Registering new palettes

Currently palettes can't be extended dynamically.
