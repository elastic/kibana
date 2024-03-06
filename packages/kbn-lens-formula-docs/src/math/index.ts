/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

export function getTypeI18n(type: string) {
  if (type === 'number') {
    return i18n.translate('lensFormulaDocs.number', { defaultMessage: 'number' });
  }
  if (type === 'string') {
    return i18n.translate('lensFormulaDocs.string', { defaultMessage: 'string' });
  }
  if (type === 'boolean') {
    return i18n.translate('lensFormulaDocs.boolean', { defaultMessage: 'boolean' });
  }
  return '';
}

export const tinymathFunctions: Record<
  string,
  {
    section: 'math' | 'comparison';
    positionalArguments: Array<{
      name: string;
      optional?: boolean;
      defaultValue?: string | number;
      type?: string;
      alternativeWhenMissing?: string;
    }>;
    // Help is in Markdown format
    help: string;
    // When omitted defaults to "number".
    // Used for comparison functions return type
    outputType?: string;
  }
> = {
  add: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.addFunction.markdown', {
      defaultMessage: `
Adds up two numbers.
Also works with \`+\` symbol.

Example: Calculate the sum of two fields

\`sum(price) + sum(tax)\`

Example: Offset count by a static value

\`add(count(), 5)\`
    `,
    }),
  },
  subtract: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.subtractFunction.markdown', {
      defaultMessage: `
Subtracts the first number from the second number.
Also works with \`-\` symbol.

Example: Calculate the range of a field
\`subtract(max(bytes), min(bytes))\`
    `,
    }),
  },
  multiply: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.multiplyFunction.markdown', {
      defaultMessage: `
Multiplies two numbers.
Also works with \`*\` symbol.

Example: Calculate price after current tax rate
\`sum(bytes) * last_value(tax_rate)\`

Example: Calculate price after constant tax rate
\`multiply(sum(price), 1.2)\`
    `,
    }),
  },
  divide: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.divideFunction.markdown', {
      defaultMessage: `
Divides the first number by the second number.
Also works with \`/\` symbol

Example: Calculate profit margin
\`sum(profit) / sum(revenue)\`

Example: \`divide(sum(bytes), 2)\`
    `,
    }),
  },
  abs: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.absFunction.markdown', {
      defaultMessage: `
Calculates absolute value. A negative value is multiplied by -1, a positive value stays the same.

Example: Calculate average distance to sea level \`abs(average(altitude))\`
    `,
    }),
  },
  cbrt: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.cbrtFunction.markdown', {
      defaultMessage: `
Cube root of value.

Example: Calculate side length from volume
\`cbrt(last_value(volume))\`
    `,
    }),
  },
  ceil: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.ceilFunction.markdown', {
      defaultMessage: `
Ceiling of value, rounds up.

Example: Round up price to the next dollar
\`ceil(sum(price))\`
    `,
    }),
  },
  clamp: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.min', { defaultMessage: 'min' }),
        type: getTypeI18n('number'),
        alternativeWhenMissing: 'pick_max',
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.max', { defaultMessage: 'max' }),
        type: getTypeI18n('number'),
        alternativeWhenMissing: 'pick_min',
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.clampFunction.markdown', {
      defaultMessage: `
Limits the value from a minimum to maximum.

Example: Make sure to catch outliers
\`\`\`
clamp(
  average(bytes),
  percentile(bytes, percentile=5),
  percentile(bytes, percentile=95)
)
\`\`\`
`,
    }),
  },
  cube: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.cubeFunction.markdown', {
      defaultMessage: `
Calculates the cube of a number.

Example: Calculate volume from side length
\`cube(last_value(length))\`
    `,
    }),
  },
  exp: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.expFunction.markdown', {
      defaultMessage: `
Raises *e* to the nth power.

Example: Calculate the natural exponential function

\`exp(last_value(duration))\`
    `,
    }),
  },
  fix: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.fixFunction.markdown', {
      defaultMessage: `
For positive values, takes the floor. For negative values, takes the ceiling.

Example: Rounding towards zero
\`fix(sum(profit))\`
    `,
    }),
  },
  floor: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.floorFunction.markdown', {
      defaultMessage: `
Round down to nearest integer value

Example: Round down a price
\`floor(sum(price))\`
    `,
    }),
  },
  log: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.base', { defaultMessage: 'base' }),
        optional: true,
        defaultValue: 'e',
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.logFunction.markdown', {
      defaultMessage: `
Logarithm with optional base. The natural base *e* is used as default.

Example: Calculate number of bits required to store values
\`\`\`
log(sum(bytes))
log(sum(bytes), 2)
\`\`\`
    `,
    }),
  },
  mod: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.base', { defaultMessage: 'base' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.modFunction.markdown', {
      defaultMessage: `
Remainder after dividing the function by a number

Example: Calculate last three digits of a value
\`mod(sum(price), 1000)\`
    `,
    }),
  },
  pow: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.base', { defaultMessage: 'base' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.powFunction.markdown', {
      defaultMessage: `
Raises the value to a certain power. The second argument is required

Example: Calculate volume based on side length
\`pow(last_value(length), 3)\`
    `,
    }),
  },
  round: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.decimals', { defaultMessage: 'decimals' }),
        optional: true,
        defaultValue: 0,
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.roundFunction.markdown', {
      defaultMessage: `
Rounds to a specific number of decimal places, default of 0

Examples: Round to the cent
\`\`\`
round(sum(bytes))
round(sum(bytes), 2)
\`\`\`
    `,
    }),
  },
  sqrt: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.sqrtFunction.markdown', {
      defaultMessage: `
Square root of a positive value only

Example: Calculate side length based on area
\`sqrt(last_value(area))\`
    `,
    }),
  },
  square: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.squareFunction.markdown', {
      defaultMessage: `
Raise the value to the 2nd power

Example: Calculate area based on side length
\`square(last_value(length))\`
    `,
    }),
  },
  pick_max: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.maxFunction.markdown', {
      defaultMessage: `
Finds the maximum value between two numbers.

Example: Find the maximum between two fields averages
\`pick_max(average(bytes), average(memory))\`
        `,
    }),
  },
  pick_min: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.minFunction.markdown', {
      defaultMessage: `
Finds the minimum value between two numbers.

Example: Find the minimum between two fields averages
\`pick_min(average(bytes), average(memory))\`
    `,
    }),
  },
  defaults: {
    section: 'math',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.value', { defaultMessage: 'value' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.defaultValue', {
          defaultMessage: 'default',
        }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.defaultFunction.markdown', {
      defaultMessage: `
Returns a default numeric value when value is null.

Example: Return -1 when a field has no data
\`defaults(average(bytes), -1)\`
`,
    }),
  },
  lt: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    outputType: getTypeI18n('boolean'),
    help: i18n.translate('lensFormulaDocs.tinymath.ltFunction.markdown', {
      defaultMessage: `
Performs a lower than comparison between two values.
To be used as condition for \`ifelse\` comparison function.
Also works with \`<\` symbol.

Example: Returns true if the average of bytes is lower than the average amount of memory
\`average(bytes) <= average(memory)\`

Example: \`lt(average(bytes), 1000)\`
    `,
    }),
  },
  gt: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    outputType: getTypeI18n('boolean'),
    help: i18n.translate('lensFormulaDocs.tinymath.gtFunction.markdown', {
      defaultMessage: `
Performs a greater than comparison between two values.
To be used as condition for \`ifelse\` comparison function.
Also works with \`>\` symbol.

Example: Returns true if the average of bytes is greater than the average amount of memory
\`average(bytes) > average(memory)\`

Example: \`gt(average(bytes), 1000)\`
    `,
    }),
  },
  eq: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    outputType: getTypeI18n('boolean'),
    help: i18n.translate('lensFormulaDocs.tinymath.eqFunction.markdown', {
      defaultMessage: `
Performs an equality comparison between two values.
To be used as condition for \`ifelse\` comparison function.
Also works with \`==\` symbol.

Example: Returns true if the average of bytes is exactly the same amount of average memory
\`average(bytes) == average(memory)\`

Example: \`eq(sum(bytes), 1000000)\`
    `,
    }),
  },
  lte: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    outputType: getTypeI18n('boolean'),
    help: i18n.translate('lensFormulaDocs.tinymath.lteFunction.markdown', {
      defaultMessage: `
Performs a lower than or equal comparison between two values.
To be used as condition for \`ifelse\` comparison function.
Also works with \`<=\` symbol.

Example: Returns true if the average of bytes is lower than or equal to the average amount of memory
\`average(bytes) <= average(memory)\`

Example: \`lte(average(bytes), 1000)\`
    `,
    }),
  },
  gte: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    outputType: getTypeI18n('boolean'),
    help: i18n.translate('lensFormulaDocs.tinymath.gteFunction.markdown', {
      defaultMessage: `
Performs a greater than comparison between two values.
To be used as condition for \`ifelse\` comparison function.
Also works with \`>=\` symbol.

Example: Returns true if the average of bytes is greater than or equal to the average amount of memory
\`average(bytes) >= average(memory)\`

Example: \`gte(average(bytes), 1000)\`
    `,
    }),
  },
  ifelse: {
    section: 'comparison',
    positionalArguments: [
      {
        name: i18n.translate('lensFormulaDocs.tinymath.condition', { defaultMessage: 'condition' }),
        type: getTypeI18n('boolean'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.left', { defaultMessage: 'left' }),
        type: getTypeI18n('number'),
      },
      {
        name: i18n.translate('lensFormulaDocs.tinymath.right', { defaultMessage: 'right' }),
        type: getTypeI18n('number'),
      },
    ],
    help: i18n.translate('lensFormulaDocs.tinymath.ifElseFunction.markdown', {
      defaultMessage: `
Returns a value depending on whether the element of condition is true or false.

Example: Average revenue per customer but in some cases customer id is not provided which counts as additional customer
\`sum(total)/(unique_count(customer_id) + ifelse( count() > count(kql='customer_id:*'), 1, 0))\`
    `,
    }),
  },
};
