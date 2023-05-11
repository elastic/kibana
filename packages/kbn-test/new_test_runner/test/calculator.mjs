import { add } from './math.mjs'

export const calculate = (op, a, b) => {
  return op === '+' ? add(a, b) : NaN
}
