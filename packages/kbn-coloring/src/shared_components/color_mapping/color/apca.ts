/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/** @public */
export type RGB = number;

/** @public */
export type A = number;

/** @internal */
export type RgbTuple = [r: RGB, g: RGB, b: RGB, alpha?: A];

/** @public */
export type RgbaTuple = [r: RGB, g: RGB, b: RGB, alpha: A];

/**
 * / //  DO NOT use a Y from any other method  /////
 * @internal
 */
export function APCAContrast([Rbg, Gbg, Bbg]: RgbTuple, [Rtxt, Gtxt, Btxt]: RgbTuple) {
  // / //  sRGB Conversion to Relative Luminance (Y)  /////

  const mainTRC = 2.4; // Transfer Curve (aka "Gamma") for sRGB linearization
  // Simple power curve vs piecewise described in docs
  // Essentially, 2.4 best models actual display
  // characteristics in combination with the total method

  const Rco = 0.2126729; // sRGB Red Coefficient (from matrix)
  const Gco = 0.7151522; // sRGB Green Coefficient (from matrix)
  const Bco = 0.072175; // sRGB Blue Coefficient (from matrix)

  // / //  For Finding Raw SAPC Contrast from Relative Luminance (Y)  /////

  const normBG = 0.56; // Constants for SAPC Power Curve Exponents
  const normTXT = 0.57; // One pair for normal text, and one for reverse
  const revTXT = 0.62; // These are the "beating heart" of SAPC
  const revBG = 0.65;

  // / //  For Clamping and Scaling Values  /////
  // constant updated to https://github.com/Myndex/SAPC-APCA#apca-math-new-098g-4g-constants
  // new 0.98G 4g constants

  const blkThrs = 0.022; // Level that triggers the soft black clamp
  const blkClmp = 1.414; // Exponent for the soft black clamp curve
  const deltaYmin = 0.0005; // Lint trap
  const scaleBoW = 1.14; // Scaling for dark text on light
  const scaleWoB = 1.14; // Scaling for light text on dark
  const loConThresh = 0.035991; // Threshold for new simple offset scale
  const loConFactor = 27.7847239587675;
  const loConOffset = 0.027; // The simple offset
  const loClip = 0.001; // Output clip (lint trap #2)

  // We are only concerned with Y at this point
  // Ybg and Ytxt: divide sRGB to 0.0-1.0 range, linearize,
  // and then apply the standard coefficients and sum to Y.
  // Note that the Y we create here is unique and designed
  // exclusively for SAPC. Do not use Y from other methods.

  let Ybg =
    Math.pow(Rbg / 255.0, mainTRC) * Rco +
    Math.pow(Gbg / 255.0, mainTRC) * Gco +
    Math.pow(Bbg / 255.0, mainTRC) * Bco;

  let Ytxt =
    Math.pow(Rtxt / 255.0, mainTRC) * Rco +
    Math.pow(Gtxt / 255.0, mainTRC) * Gco +
    Math.pow(Btxt / 255.0, mainTRC) * Bco;

  let SAPC = 0.0; // For holding raw SAPC values
  let outputContrast = 0.0; // For weighted final values

  // / // TUTORIAL  /////

  // Take Y and soft clamp black, return 0 for very close luminances
  // determine polarity, and calculate SAPC raw contrast
  // Then apply the output scaling

  // Note that reverse contrast (white text on black)
  // intentionally returns a negative number
  // Proper polarity is important!

  // / ///////   BLACK SOFT CLAMP & INPUT CLIP  ////////////////////////////////

  // Soft clamp Y when near black.
  // Now clamping all colors to prevent crossover errors
  Ytxt = Ytxt > blkThrs ? Ytxt : Ytxt + Math.pow(blkThrs - Ytxt, blkClmp);

  Ybg = Ybg > blkThrs ? Ybg : Ybg + Math.pow(blkThrs - Ybg, blkClmp);

  // / //   Return 0 Early for extremely low ∆Y (lint trap #1) /////
  if (Math.abs(Ybg - Ytxt) < deltaYmin) {
    return 0.0;
  }

  // / ///////   SAPC CONTRAST   ///////////////////////////////////////////////

  if (Ybg > Ytxt) {
    // For normal polarity, black text on white

    // / // Calculate the SAPC contrast value and scale

    SAPC = (Math.pow(Ybg, normBG) - Math.pow(Ytxt, normTXT)) * scaleBoW;

    // / // NEW! SAPC SmoothScale™
    // Low Contrast Smooth Scale Rollout to prevent polarity reversal
    // and also a low clip for very low contrasts (lint trap #2)
    // much of this is for very low contrasts, less than 10
    // therefore for most reversing needs, only loConOffset is important
    outputContrast =
      SAPC < loClip
        ? 0.0
        : SAPC < loConThresh
        ? SAPC - SAPC * loConFactor * loConOffset
        : SAPC - loConOffset;
  } else {
    // For reverse polarity, light text on dark
    // WoB should always return negative value.

    SAPC = (Math.pow(Ybg, revBG) - Math.pow(Ytxt, revTXT)) * scaleWoB;

    outputContrast =
      SAPC > -loClip
        ? 0.0
        : SAPC > -loConThresh
        ? SAPC - SAPC * loConFactor * loConOffset
        : SAPC + loConOffset;
  }

  return outputContrast * 100;
} // Close APCAcontrast()

// / /\                            ///////////////////////////////////////////\
// / //\  END OF SAPC/APCA BLOCK  /////////////////////////////////////////////\
// / ///////////////////////////////////////////////////////////////////////////\
// / ////////////////////////////////////////////////////////////////////////////\
