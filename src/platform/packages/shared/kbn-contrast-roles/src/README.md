# Contrast roles

Every color is a hue plus a role, resolved against the surface it's drawn on.

```ts
import { createContrastRoles, DEFAULT_PARAMS } from '.';

const borealis = createContrastRoles({
  surfaces: { light: '#FFFFFF', dark: '#111C2C' }, // each mode's far end is the other mode's surface
  hues: [{ name: 'blue', base: '#61A2FF' } /* ... */], // base: the hue's anchor color (e.g. EUI's /60)
  neutralTint: '#F6F9FC', // diverging middle on a surface with no hue
});

const light = borealis.palettes('#FFFFFF', DEFAULT_PARAMS);
light.roles; // [{ name, faint, muted, base, strong, ink }]
light.intertwined; // stacked bars: base, muted per hue; params.stack.pair 'strong': base, strong (yellow keeps muted)
light.lines; // base, strong per hue; params.lines.order 'split': every base, then every strong
light.sequential('blue', 5);
light.diverging('blue', 'red', 5);
```
