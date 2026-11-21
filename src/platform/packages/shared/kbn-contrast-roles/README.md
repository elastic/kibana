# @kbn/contrast-roles

Experimental: data-vis colors as a hue plus a role (`faint`, `muted`, `base`, `strong`, `ink`), each solved as an
APCA Lc target against the surface it's drawn on, so they work in both light and dark mode. Not for merging as is.

- `src/`: the algorithm, a copy of `src/contrast-roles` from the vis-color-workbench repo, which is the source of
  truth. Keep the two in sync; the only changes are Kibana's license header, lint and formatting, snake_case file
  names, and `rolesAt` (to be ported back). `test/check_palettes.snap.json` is the workbench's snapshot and proves the
  copy matches.
- `borealis.ts`: the Borealis input (surfaces from `@kbn/ui-theme`, hues from `@elastic/eui-theme-borealis`).
- `match.ts`: a color as the base of its own hue

TODO before shipping: check the APCA license. APCA contrast comes from colorjs.io (`contrastAPCA`), an implementation
of Myndex's APCA, whose terms have changed across versions; confirm it can be used in Kibana.
