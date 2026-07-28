/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * This type contains a unions of all supported font labels, or the the name of
 * the font the user would see in a UI.
 */
export type FontLabel = (typeof fonts)[number]['label'];
/**
 * This type contains a union of all supported font values, equivalent to the CSS
 * `font-value` property.
 */
export type FontValue = (typeof fonts)[number]['value'];
/**
 * An interface representing a font in Canvas, with a textual label and the CSS
 * `font-value`.
 */
export interface Font {
  label: FontLabel;
  value: FontValue;
}
export declare const americanTypewriter: {
  label: 'American Typewriter';
  value: "'American Typewriter', 'Courier New', Courier, Monaco, mono";
};
export declare const arial: {
  label: 'Arial';
  value: 'Arial, sans-serif';
};
export declare const baskerville: {
  label: 'Baskerville';
  value: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif";
};
export declare const bookAntiqua: {
  label: 'Book Antiqua';
  value: "'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif";
};
export declare const brushScript: {
  label: 'Brush Script';
  value: "'Brush Script MT', 'Comic Sans', sans-serif";
};
export declare const chalkboard: {
  label: 'Chalkboard';
  value: "Chalkboard, 'Comic Sans', sans-serif";
};
export declare const didot: {
  label: 'Didot';
  value: "Didot, Georgia, Garamond, 'Times New Roman', Times, serif";
};
export declare const futura: {
  label: 'Futura';
  value: 'Futura, Impact, Helvetica, Arial, sans-serif';
};
export declare const gillSans: {
  label: 'Gill Sans';
  value: "'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif";
};
export declare const helveticaNeue: {
  label: 'Helvetica Neue';
  value: "'Helvetica Neue', Helvetica, Arial, sans-serif";
};
export declare const hoeflerText: {
  label: 'Hoefler Text';
  value: "'Hoefler Text', Garamond, Georgia, 'Times New Roman', Times, serif";
};
export declare const inter: {
  label: 'Inter';
  value: "'Inter', 'Inter UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
};
export declare const lucidaGrande: {
  label: 'Lucida Grande';
  value: "'Lucida Grande', 'Lucida Sans Unicode', Lucida, Verdana, Helvetica, Arial, sans-serif";
};
export declare const myriad: {
  label: 'Myriad';
  value: 'Myriad, Helvetica, Arial, sans-serif';
};
export declare const openSans: {
  label: 'Open Sans';
  value: "'Open Sans', Helvetica, Arial, sans-serif";
};
export declare const optima: {
  label: 'Optima';
  value: "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif";
};
export declare const palatino: {
  label: 'Palatino';
  value: "Palatino, 'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif";
};
/**
 * A collection of supported fonts.
 */
export declare const fonts: (
  | {
      label: 'American Typewriter';
      value: "'American Typewriter', 'Courier New', Courier, Monaco, mono";
    }
  | {
      label: 'Arial';
      value: 'Arial, sans-serif';
    }
  | {
      label: 'Baskerville';
      value: "Baskerville, Georgia, Garamond, 'Times New Roman', Times, serif";
    }
  | {
      label: 'Book Antiqua';
      value: "'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif";
    }
  | {
      label: 'Brush Script';
      value: "'Brush Script MT', 'Comic Sans', sans-serif";
    }
  | {
      label: 'Chalkboard';
      value: "Chalkboard, 'Comic Sans', sans-serif";
    }
  | {
      label: 'Didot';
      value: "Didot, Georgia, Garamond, 'Times New Roman', Times, serif";
    }
  | {
      label: 'Futura';
      value: 'Futura, Impact, Helvetica, Arial, sans-serif';
    }
  | {
      label: 'Gill Sans';
      value: "'Gill Sans', 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif";
    }
  | {
      label: 'Helvetica Neue';
      value: "'Helvetica Neue', Helvetica, Arial, sans-serif";
    }
  | {
      label: 'Hoefler Text';
      value: "'Hoefler Text', Garamond, Georgia, 'Times New Roman', Times, serif";
    }
  | {
      label: 'Inter';
      value: "'Inter', 'Inter UI', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
    }
  | {
      label: 'Lucida Grande';
      value: "'Lucida Grande', 'Lucida Sans Unicode', Lucida, Verdana, Helvetica, Arial, sans-serif";
    }
  | {
      label: 'Myriad';
      value: 'Myriad, Helvetica, Arial, sans-serif';
    }
  | {
      label: 'Open Sans';
      value: "'Open Sans', Helvetica, Arial, sans-serif";
    }
  | {
      label: 'Optima';
      value: "Optima, 'Lucida Grande', 'Lucida Sans Unicode', Verdana, Helvetica, Arial, sans-serif";
    }
  | {
      label: 'Palatino';
      value: "Palatino, 'Book Antiqua', Georgia, Garamond, 'Times New Roman', Times, serif";
    }
)[];
