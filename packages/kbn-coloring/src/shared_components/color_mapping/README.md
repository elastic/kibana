# Color Mapping

This shared component can be used to define a color mapping as an association of one or multiple string values to a color definition.

This package provides:
- a React component, called `CategoricalColorMapping` that provides a simplified UI (that in general can be hosted in a flyout), that helps the user generate a `ColorMapping.Config` object that descibes the mappings configuration
- a function `getColorFactory` that given a color mapping configuration returns a function that maps a passed category to the corresponding color
- a definition scheme for the color mapping, based on the type `ColorMapping.Config`, that provides an extensible way of describing the link betwe


An example of a configuration is the following:
```ts
const DEFAULT_COLOR_MAPPING_CONFIG: ColorMapping.Config = {
  assignmentMode: 'auto',
  assignments: [
    {
        rule: {
            type: 'matchExactly',
            values: [''];
        },
        color: {
            type: 'categorical',
            paletteId: 'eui',
            colorIndex: 2,
        }
    }
  ],
  specialAssignments: [
    {
      rule: {
        type: 'other',
      },
      color: {
        type: 'categorical',
        paletteId: 'neutral',
        colorIndex: 2
      },
      touched: false,
    },
  ],
  paletteId: EUIPalette.id,
  colorMode: {
    type: 'categorical',
  },
};
```

The function `getColorFactory` has the following type:
```ts
function getColorFactory(
  model: ColorMapping.Config,
  getPaletteFn: (paletteId: string) => ColorMapping.CategoricalPalette,
  isDarkMode: boolean,
  data: {
      type: 'categories';
      categories: Array<string | string[]>;
    }
): (category: string | string[]) => Color
```
where given the model, a palette getter, the theme mode (dark/light) and a list of categories, it will return a function that can be used to pick the right color based on the passed category.


A `category` can be in the shape of a plain string (trimmed) or an array of strings. Numbers, MultiFieldKey, IP etc needs to be stringified.


The `CategoricalColorMapping` React component has the following props:

```tsx
function CategoricalColorMapping(props: {
    /** the initial color mapping model, usually coming from a the visualization saved object */
  model: ColorMapping.Config;
  /** A map of paletteId and palette configuration */
  palettes: Map<string, ColorMapping.CategoricalPalette>;
  data: ColorMappingInputData;
  isDarkMode: boolean;
  /** map between original and formatted tokens used to handle special cases, like the Other bucket and the empty bucket */
  specialTokens: Map<string, string>;
  /** a function called at every change in the model */
  onModelUpdate: (model: ColorMapping.Config) => void;
})

```

the `onModelUpdate` callback is called everytime a change in the model is applied from within the component. Is not called when the `model` prop is updated.