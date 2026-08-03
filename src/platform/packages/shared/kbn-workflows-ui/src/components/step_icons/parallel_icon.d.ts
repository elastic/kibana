import React from 'react';
/**
 * The parallel-step glyph (two vertical parallel bars) as a React component so it
 * can be passed straight to `EuiIcon`'s `type` prop and inherit the current text
 * color via `fill="currentColor"`. Passing the SVG as a data URL instead would
 * render it inside an `<img>`, which cannot honor `currentColor`.
 */
export declare const ParallelIcon: (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element;
