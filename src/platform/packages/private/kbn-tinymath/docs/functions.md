# TinyMath Functions
This document provides detailed information about the functions available in Tinymath and lists what parameters each function accepts, the return value of that function, and examples of how each function behaves. Most of the functions below accept arrays and apply JavaScript Math methods to each element of that array. For the functions that accept multiple arrays as parameters, the function generally does calculation index by index. Any function below can be wrapped by another function as long as the return type of the inner function matches the acceptable parameter type of the outer function. An expression can't contain an array directly, so the examples with arrays show what each function returns for array values from the data that the expression runs on. If a value isn't a number, such as null, most functions return `NaN` instead of running. The exceptions are `count`, `defaults`, `first`, `ifelse`, `last`, `size`, and `unique`.

## _abs(_ _a_ _)_
Calculates the absolute value of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The absolute value of `a`. Returns an array with the absolute values of each element if `a` is an array.  
**Example**  
```js
abs(-1) // returns 1
abs(2) // returns 2
abs([-1 , -2, 3, -4]) // returns [1, 2, 3, 4]
```
***
## _add(_ ..._args_ _)_
Calculates the sum of one or more numbers/arrays passed into the function. If you pass several arguments and at least one is an array, the function will calculate the sum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The sum of all numbers in `args` if `args` contains only numbers. Returns an array of sums of the elements at each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element. A single empty array throws an error.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
add(1, 2, 3) // returns 6
add([10, 20, 30, 40], 10, 20, 30) // returns [70, 80, 90, 100]
add([1, 2], 3, [4, 5], 6) // returns [(1 + 3 + 4 + 6), (2 + 3 + 5 + 6)] = [14, 16]
```
***
## _cbrt(_ _a_ _)_
Calculates the cube root of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cube root of `a`. Returns an array with the cube roots of each element if `a` is an array.  
**Example**  
```js
cbrt(-27) // returns -3
cbrt(94) // returns 4.546835943776344
cbrt([27, 64, 125]) // returns [3, 4, 5]
```
***
## _ceil(_ _a_ _)_
Calculates the ceiling of a number, that is, rounds a number toward positive infinity. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The ceiling of `a`. Returns an array with the ceilings of each element if `a` is an array.  
**Example**  
```js
ceil(1.2) // returns 2
ceil(-1.8) // returns -1
ceil([1.1, 2.2, 3.3]) // returns [2, 3, 4]
```
***
## _clamp(_ _a_,  _min_,  _max_ _)_
Restricts a value to a given range. Returns `min` if the value is below it, `max` if the value is above it, and the value itself otherwise. To limit a value on one side only, use the `max` function for a lower limit or the `min` function for an upper limit. For example, `max(value, 5)` returns at least 5, and `min(value, 5)` returns at most 5.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| min | <code>number</code> \| <code>Array.&lt;number&gt;</code> | The minimum value this function returns. |
| max | <code>number</code> \| <code>Array.&lt;number&gt;</code> | The maximum value this function returns. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The closest value between `min` (inclusive) and `max` (inclusive). Returns an array with values greater than or equal to `min` and less than or equal to `max` at each index if `a`, `min`, or `max` is an array. In an expression, if you leave out `min` or `max`, the result is `NaN`, or an array of `NaN` values if `a` or `min` is an array. If `a` and `min` are both arrays and `max` is a number, each element of the result is `NaN`.  
**Throws**:

- `'Array length mismatch'` if `a`, `min`, or `max` are arrays of different lengths
- `'Min must be less than max'` if `max` is less than `min`
- `'Missing minimum value. You may want to use the 'max' function instead'` if `min` is null and you call the function directly
- `'Missing maximum value. You may want to use the 'min' function instead'` if `max` is null and you call the function directly

**Example**  
```js
clamp(1, 2, 3) // returns 2
clamp([10, 20, 30, 40], 15, 25) // returns [15, 20, 25, 25]
clamp(10, [15, 2, 4, 20], 25) // returns [15, 10, 10, 20]
clamp(35, 10, [20, 30, 40, 50]) // returns [20, 30, 35, 35]
clamp([1, 9], 3, [4, 5]) // returns [clamp([1, 3, 4]), clamp([9, 3, 5])] = [3, 5]
```
***
## _eq(_ _a_,  _b_ _)_
Checks whether two values are equal. For arrays, the function returns `true` only if every element is equal.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number, or, if `a` is also an array, an array of numbers with the same length as `a` |

**Returns**: <code>boolean</code> - `true` if `a` and `b` are equal, `false` otherwise. If `a` is an array, returns `true` only if every element of `a` equals `b`, or equals the element at the same index of `b` if `b` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `a` and `b` are arrays of different lengths

**Example**  
```js
eq(1, 1) // returns true
eq(1, 2) // returns false
eq([1, 1], 1) // returns true
eq([1, 2], 1) // returns false
eq([1, 2], [1, 2]) // returns true
```
***
## _gt(_ _a_,  _b_ _)_
Checks whether one value is greater than another. For arrays, the function returns `true` only if every element is greater.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number, or, if `a` is also an array, an array of numbers with the same length as `a` |

**Returns**: <code>boolean</code> - `true` if `a` is greater than `b`, `false` otherwise. If `a` is an array, returns `true` only if every element of `a` is greater than `b`, or greater than the element at the same index of `b` if `b` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `a` and `b` are arrays of different lengths

**Example**  
```js
gt(1, 1) // returns false
gt(2, 1) // returns true
gt([2, 3], 1) // returns true
gt([1, 2], 1) // returns false
gt([1, 2], [0, 1]) // returns true
```
***
## _gte(_ _a_,  _b_ _)_
Checks whether one value is greater than or equal to another. If either argument is an array, the function returns `true` only if every element satisfies the comparison.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - `true` if `a` is greater than or equal to `b`, `false` otherwise. If `a` or `b` is an array, returns `true` only if every element satisfies the comparison.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `a` and `b` are arrays of different lengths

**Example**  
```js
gte(1, 1) // returns true
gte(1, 2) // returns false
gte([1, 2], 2) // returns false
gte([1, 2], [1, 1]) // returns true
gte(2, [1, 2]) // returns true
```
***
## _ifelse(_ _cond_,  _a_,  _b_ _)_
Returns one of two values, depending on a condition.


| Param | Type | Description |
| --- | --- | --- |
| cond | <code>boolean</code> | a condition, such as `5 > 6` or the result of a comparison function |
| a | <code>any</code> \| <code>Array.&lt;any&gt;</code> | the value to return if `cond` is true |
| b | <code>any</code> \| <code>Array.&lt;any&gt;</code> | the value to return if `cond` is false |

**Returns**: <code>any</code> \| <code>Array.&lt;any&gt;</code> - `a` if `cond` is true, otherwise `b`. TinyMath evaluates both `a` and `b` first, so an error in either one stops the expression. For example, `ifelse(5 < 6, 1, 1 / 0)` throws `'Cannot divide by 0'`. Comparing arrays gives one boolean. `ifelse` therefore picks one value for the whole array, not one per element.  
**Throws**:

- `'Condition clause is of the wrong type'` if `cond` is not a boolean
- `'Missing a value'` if `a` is not provided or is null
- `'Missing b value'` if `b` is not provided or is null

**Example**  
```js
ifelse(5 > 6, 1, 0) // returns 0
ifelse(1 == 1, 7, 5) // returns 7
ifelse(1 < 2, [1, 2, 3], [2, 3, 4]) // returns [1, 2, 3]
ifelse(gt([0, 3], 1), 10, 20) // returns 20
```
***
## _lt(_ _a_,  _b_ _)_
Checks whether one value is less than another. For arrays, the function returns `true` only if every element is less.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number, or, if `a` is also an array, an array of numbers with the same length as `a` |

**Returns**: <code>boolean</code> - `true` if `a` is less than `b`, `false` otherwise. If `a` is an array, returns `true` only if every element of `a` is less than `b`, or less than the element at the same index of `b` if `b` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `a` and `b` are arrays of different lengths

**Example**  
```js
lt(1, 1) // returns false
lt(1, 2) // returns true
lt([1, 2], 3) // returns true
lt([1, 2], 2) // returns false
lt([1, 2], [2, 3]) // returns true
```
***
## _lte(_ _a_,  _b_ _)_
Checks whether one value is less than or equal to another. If either argument is an array, the function returns `true` only if every element satisfies the comparison.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - `true` if `a` is less than or equal to `b`, `false` otherwise. If `a` or `b` is an array, returns `true` only if every element satisfies the comparison.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `a` and `b` are arrays of different lengths

**Example**  
```js
lte(1, 1) // returns true
lte(1, 2) // returns true
lte([1, 2], 2) // returns true
lte([1, 2], [1, 1]) // returns false
lte(1, [1, 2]) // returns true
```
***
## _cos(_ _a_ _)_
Calculates the cosine of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cosine of `a`. Returns an array with the cosine of each element if `a` is an array.  
**Example**  
```js
cos(0) // returns 1
cos(1.5707963267948966) // returns 6.123233995736766e-17
cos([0, 1.5707963267948966]) // returns [1, 6.123233995736766e-17]
```
***
## _count(_ _a_ _)_
Returns the length of an array. Alias for size


| Param | Type | Description |
| --- | --- | --- |
| a | <code>Array.&lt;any&gt;</code> | array of any values |

**Returns**: <code>number</code> - The length of the array.  
**Throws**:

- `'Must pass an array'` if `a` is not an array

**Example**  
```js
count([]) // returns 0
count([-1, -2, -3, -4]) // returns 4
```
***
## _cube(_ _a_ _)_
Calculates the cube of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cube of `a`. Returns an array with the cubes of each element if `a` is an array.  
**Example**  
```js
cube(-3) // returns -27
cube([3, 4, 5]) // returns [27, 64, 125]
```
***
## _defaults(_ _a_,  _b_ _)_
Replaces null values with a fallback value. For arrays, the function will be applied index-wise to each element and also replaces undefined elements, such as the value of a row that doesn&#x27;t have the column.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>any</code> \| <code>Array.&lt;any&gt;</code> | a value or an array of values that can include null |
| b | <code>any</code> | the value to use in place of null |

**Returns**: <code>any</code> \| <code>Array.&lt;any&gt;</code> - `a` if it isn't null, otherwise `b`. Returns an array with `b` in place of each null or undefined element if `a` is an array.  
**Example**  
```js
defaults(5, 1) // returns 5
defaults(value, 1) // returns 1 if value is null
defaults(prices, 0) // returns [3, 0, 5] if prices is [3, null, 5]
```
***
## _degtorad(_ _a_ _)_
Converts degrees to radians for a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in degrees. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The radians of `a`. Returns an array with the radians of each element if `a` is an array.  
**Example**  
```js
degtorad(0) // returns 0
degtorad(90) // returns 1.5707963267948966
degtorad([0, 90, 180, 360]) // returns [0, 1.5707963267948966, 3.141592653589793, 6.283185307179586]
```
***
## _divide(_ _a_,  _b_ _)_
Divides two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | dividend, a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | divisor, a number or an array of numbers, `b` != 0 |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The quotient of `a` and `b` if both are numbers. Returns an array with the quotients applied index-wise to each element if `a` or `b` is an array.  
**Throws**:

- `'Array length mismatch'` if `a` and `b` are arrays with different lengths
- `'Cannot divide by 0'` if `b` equals 0 or contains 0

**Example**  
```js
divide(6, 3) // returns 2
divide([10, 20, 30, 40], 10) // returns [1, 2, 3, 4]
divide(10, [1, 2, 5, 10]) // returns [10, 5, 2, 1]
divide([14, 42, 65, 108], [2, 7, 5, 12]) // returns [7, 6, 13, 9]
```
***
## _exp(_ _a_ _)_
Calculates _e^x_ where _e_ is Euler&#x27;s number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - `e^a`. Returns an array with the values of `e^x` evaluated where `x` is each element of `a` if `a` is an array.  
**Example**  
```js
exp(2) // returns e^2 = 7.38905609893065
exp([1, 2, 3]) // returns [e^1, e^2, e^3] = [2.718281828459045, 7.38905609893065, 20.085536923187668]
```
***
## _first(_ _a_ _)_
Returns the first element of an array. If anything other than an array is passed in, the input is returned.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>any</code> \| <code>Array.&lt;any&gt;</code> | a value or an array of values |

**Returns**: <code>\*</code> - The first element of `a`. Returns `a` if `a` is not an array.  
**Example**  
```js
first(2) // returns 2
first([1, 2, 3]) // returns 1
```
***
## _fix(_ _a_ _)_
Calculates the fix of a number, that is, rounds a number toward 0. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The fix of `a`. Returns an array with the fixes for each element if `a` is an array.  
**Example**  
```js
fix(1.2) // returns 1
fix(-1.8) // returns -1
fix([1.8, 2.9, -3.7, -4.6]) // returns [1, 2, -3, -4]
```
***
## _floor(_ _a_ _)_
Calculates the floor of a number, that is, rounds a number toward negative infinity. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The floor of `a`. Returns an array with the floor of each element if `a` is an array.  
**Example**  
```js
floor(1.8) // returns 1
floor(-1.2) // returns -2
floor([1.7, 2.8, 3.9]) // returns [1, 2, 3]
```
***
## _last(_ _a_ _)_
Returns the last element of an array. If anything other than an array is passed in, the input is returned.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>any</code> \| <code>Array.&lt;any&gt;</code> | a value or an array of values |

**Returns**: <code>\*</code> - The last element of `a`. Returns `a` if `a` is not an array.  
**Example**  
```js
last(2) // returns 2
last([1, 2, 3]) // returns 3
```
***
## _log(_ _a_,  _b_ _)_
Calculates the logarithm of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` can't be negative |
| b | <code>number</code> | (optional) base for the logarithm. If you don't provide a base, the function uses e and calculates the natural logarithm. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The logarithm of `a`. Returns an array with the logarithms of each element if `a` is an array.  
**Throws**:

- `'Base out of range'` if `b` is less than or equal to 0
- `'Must be greater than 0'` if `a` < 0

**Example**  
```js
log(1) // returns 0
log(64, 8) // returns 2
log(42, 5) // returns 2.322344707681546
log([2, 4, 8, 16, 32], 2) // returns [1, 2, 3, 4, 5]
```
***
## _log10(_ _a_ _)_
Calculates the base 10 logarithm of a number. For arrays, the function will be applied index-wise to each element. Expressions don&#x27;t accept the name `log10`, because function names can&#x27;t contain digits. To calculate a base 10 logarithm, use `log` with a base of 10, as in the examples.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` can't be negative |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The logarithm of `a`. Returns an array with the logarithms base 10 of each element if `a` is an array. The result can differ from the exact value in the last digits, as in `log(1000, 10)`, which returns `2.9999999999999996`.  
**Throws**:

- `'Must be greater than 0'` if `a` < 0

**Example**  
```js
log(10, 10) // returns 1
log(100, 10) // returns 2
log(80, 10) // returns 1.9030899869919433
log([10, 100, 10000, 100000], 10) // returns [1, 2, 4, 5]
```
***
## _max(_ ..._args_ _)_
Finds the maximum value of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the maximum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The maximum value of all numbers if `args` contains only numbers. Returns an array with the maximum values at each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element. A single empty array throws an error.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
max(1, 2, 3) // returns 3
max([10, 20, 30, 40], 15) // returns [15, 20, 30, 40]
max([1, 9], 4, [3, 5]) // returns [max([1, 4, 3]), max([9, 4, 5])] = [4, 9]
```
***
## _mean(_ ..._args_ _)_
Finds the mean value of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the mean by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The mean value of all numbers if `args` contains only numbers. Returns an array with the mean values of each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element. A single empty array throws an error.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
mean(1, 2, 3) // returns 2
mean([10, 20, 30, 40], 20) // returns [15, 20, 25, 30]
mean([1, 9], 5, [3, 4]) // returns [mean([1, 5, 3]), mean([9, 5, 4])] = [3, 6]
```
***
## _median(_ ..._args_ _)_
Finds the median value(s) of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the median by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The median value of all numbers if `args` contains only numbers. Returns an array with the median values of each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element, and `median` sorts that array in place in descending order. A later use of the same array in the expression sees the sorted values.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths, unless the first array is empty, in which case the result is an empty array

**Example**  
```js
median(1, 1, 2, 3) // returns 1.5
median(1, 1, 2, 2, 3) // returns 2
median([10, 20, 30, 40], 10, 20, 30) // returns [15, 20, 25, 25]
median([1, 9], 2, 4, [3, 5]) // returns [median([1, 2, 4, 3]), median([9, 2, 4, 5])] = [2.5, 4.5]
```
***
## _min(_ ..._args_ _)_
Finds the minimum value of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the minimum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The minimum value of all numbers if `args` contains only numbers. Returns an array with the minimum values of each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element. A single empty array throws an error.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
min(1, 2, 3) // returns 1
min([10, 20, 30, 40], 25) // returns [10, 20, 25, 25]
min([1, 9], 4, [3, 5]) // returns [min([1, 4, 3]), min([9, 4, 5])] = [1, 4]
```
***
## _mod(_ _a_,  _b_ _)_
Remainder after dividing two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | dividend, a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | divisor, a number or an array of numbers, `b` != 0 |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The remainder of `a` divided by `b` if both are numbers. Returns an array with the remainders applied index-wise to each element if `a` or `b` is an array. If `a` is a number and `b` is an array that contains 0, the result for that element is `NaN`.  
**Throws**:

- `'Array length mismatch'` if `a` and `b` are arrays with different lengths
- `'Cannot divide by 0'` if `b` is 0, or if `a` and `b` are both arrays and `b` contains 0

**Example**  
```js
mod(10, 7) // returns 3
mod([11, 22, 33, 44], 10) // returns [1, 2, 3, 4]
mod(100, [3, 7, 11, 23]) // returns [1, 2, 1, 8]
mod([14, 42, 65, 108], [5, 4, 14, 2]) // returns [4, 2, 9, 0]
```
***
## _mode(_ ..._args_ _)_
Finds the mode value(s) of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the mode by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> \| <code>Array.&lt;Array.&lt;number&gt;&gt;</code> - If you pass a single number, returns that number. If you pass only numbers, or a single array, returns an array of the mode value(s) of every value. If you pass several arguments and at least one is an array, returns an array of arrays with the mode value(s) at each index, including all scalar numbers in `args` in the calculation at each index.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths, unless the first array is empty, in which case the result is an empty array

**Example**  
```js
mode(1, 1, 2, 3) // returns [1]
mode(1, 1, 2, 2, 3) // returns [1,2]
mode([10, 20, 30, 40], 10, 20, 30) // returns [[10], [20], [30], [10, 20, 30, 40]]
mode([1, 9], 1, 4, [3, 5]) // returns [mode([1, 1, 4, 3]), mode([9, 1, 4, 5])] = [[1], [1, 4, 5, 9]]
```
***
## _multiply(_ _a_,  _b_ _)_
Multiplies two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The product of `a` and `b` if both are numbers. Returns an array with the products applied index-wise to each element if `a` or `b` is an array.  
**Throws**:

- `'Array length mismatch'` if `a` and `b` are arrays with different lengths

**Example**  
```js
multiply(6, 3) // returns 18
multiply([10, 20, 30, 40], 10) // returns [100, 200, 300, 400]
multiply(10, [1, 2, 5, 10]) // returns [10, 20, 50, 100]
multiply([1, 2, 3, 4], [2, 7, 5, 12]) // returns [2, 14, 15, 48]
```
***
## _pi(__)_
Returns the mathematical constant pi

**Returns**: <code>number</code> - The mathematical constant PI  
**Example**  
```js
pi() // returns 3.141592653589793
```
***
## _pow(_ _a_,  _b_ _)_
Raises a number to a given exponent. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> | the power that `a` is raised to |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - `a` raised to the power of `b`. Returns an array with each element raised to the power of `b` if `a` is an array.  
**Throws**:

- `'Missing exponent'` if `b` is not provided

**Example**  
```js
pow(2,3) // returns 8
pow([1, 2, 3], 4) // returns [1, 16, 81]
```
***
## _radtodeg(_ _a_ _)_
Converts radians to degrees for a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The degrees of `a`. Returns an array with the degrees of each element if `a` is an array.  
**Example**  
```js
radtodeg(0) // returns 0
radtodeg(1.5707963267948966) // returns 90
radtodeg([0, 1.5707963267948966, 3.141592653589793, 6.283185307179586]) // returns [0, 90, 180, 360]
```
***
## _random(_ _a_,  _b_ _)_
Generates a random number within the given range where the lower bound is inclusive and the upper bound is exclusive. If no numbers are passed in, it will return a number between 0 and 1. If only one number is passed in, it will return a number between 0 and the number passed in. If both bounds are the same finite number, as in `random(0)` or `random(5, 5)`, it returns that number.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> | (optional) must be 0 or greater if `b` is not provided |
| b | <code>number</code> | (optional) must be greater than or equal to `a` |

**Returns**: <code>number</code> - A random number between 0 and 1 if no numbers are passed in. Returns a random number between 0 and `a` if only one number is passed in. Returns a random number between `a` and `b` if two numbers are passed in.  
**Throws**:

- `'Min is greater than max'` if `a` < 0 when only `a` is passed in or if `a` > `b` when both `a` and `b` are passed in

**Example**  
```js
random() // returns a random number between 0 (inclusive) and 1 (exclusive)
random(10) // returns a random number between 0 (inclusive) and 10 (exclusive)
random(-10,10) // returns a random number between -10 (inclusive) and 10 (exclusive)
```
***
## _range(_ ..._args_ _)_
Finds the range of one or more numbers or arrays of numbers. If you pass several arguments and at least one is an array, the function will find the range by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The range value of all numbers if `args` contains only numbers. Returns an array with the range values at each index, including all scalar numbers in `args` in the calculation at each index if you pass several arguments and at least one is an array. If you pass a single array, the result covers every element. A single empty array throws an error.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
range(1, 2, 3) // returns 2
range([10, 20, 30, 40], 15) // returns [5, 5, 15, 25]
range([1, 9], 4, [3, 5]) // returns [range([1, 4, 3]), range([9, 4, 5])] = [3, 5]
```
***
## _round(_ _a_,  _b_ _)_
Rounds a number to the nearest integer by default, or to a number of decimal places if you pass `b`. A value exactly halfway rounds toward positive infinity. Decimals such as 1.005 aren&#x27;t stored exactly in binary, so `round(1.005, 2)` returns 1, not 1.01. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> | (optional) number of decimal places, default value: 0 |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The rounded value of `a`. Returns an array with the rounded values of each element if `a` is an array.  
**Example**  
```js
round(1.2) // returns 1
round(-10.51) // returns -11
round(-10.1, 2) // returns -10.1
round(10.93745987, 4) // returns 10.9375
round(2.5) // returns 3
round(-2.5) // returns -2
round(1.005, 2) // returns 1
round([2.9234, 5.1234, 3.5234, 4.49234324], 2) // returns [2.92, 5.12, 3.52, 4.49]
```
***
## _sin(_ _a_ _)_
Calculates the sine of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The sine of `a`. Returns an array with the sine of each element if `a` is an array.  
**Example**  
```js
sin(0) // returns 0
sin(1.5707963267948966) // returns 1
sin([0, 1.5707963267948966]) // returns [0, 1]
```
***
## _size(_ _a_ _)_
Returns the length of an array. Alias for count


| Param | Type | Description |
| --- | --- | --- |
| a | <code>Array.&lt;any&gt;</code> | array of any values |

**Returns**: <code>number</code> - The length of the array.  
**Throws**:

- `'Must pass an array'` if `a` is not an array

**Example**  
```js
size([]) // returns 0
size([-1, -2, -3, -4]) // returns 4
```
***
## _sqrt(_ _a_ _)_
Calculates the square root of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The square root of `a`. Returns an array with the square roots of each element if `a` is an array.  
**Throws**:

- `'Unable find the square root of a negative number'` if `a` < 0

**Example**  
```js
sqrt(9) // returns 3
sqrt(30) // returns 5.477225575051661
sqrt([9, 16, 25]) // returns [3, 4, 5]
```
***
## _square(_ _a_ _)_
Calculates the square of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The square of `a`. Returns an array with the squares of each element if `a` is an array.  
**Example**  
```js
square(-3) // returns 9
square([3, 4, 5]) // returns [9, 16, 25]
```
***
## _subtract(_ _a_,  _b_ _)_
Subtracts two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The difference of `a` and `b` if both are numbers or an array of differences applied index-wise to each element.  
**Throws**:

- `'Array length mismatch'` if `a` and `b` are arrays with different lengths

**Example**  
```js
subtract(6, 3) // returns 3
subtract([10, 20, 30, 40], 10) // returns [0, 10, 20, 30]
subtract(10, [1, 2, 5, 10]) // returns [9, 8, 5, 0]
subtract([14, 42, 65, 108], [2, 7, 5, 12]) // returns [12, 35, 60, 96]
```
***
## _sum(_ ..._args_ _)_
Calculates the sum of one or more numbers/arrays passed into the function. If an argument is an array, the function adds all of its elements. The arrays can have different lengths.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> - The sum of all numbers and all elements of any arrays in `args`  
**Example**  
```js
sum(1, 2, 3) // returns 6
sum([10, 20, 30, 40], 10, 20, 30) // returns 160
sum([1, 2], 3, [4, 5], 6) // returns sum(1, 2, 3, 4, 5, 6) = 21
sum([10, 20, 30, 40], 10, [1, 2, 3], 22) // returns sum(10, 20, 30, 40, 10, 1, 2, 3, 22) = 138
```
***
## _tan(_ _a_ _)_
Calculates the tangent of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The tangent of `a`. Returns an array with the tangent of each element if `a` is an array.  
**Example**  
```js
tan(0) // returns 0
tan(1) // returns 1.5574077246549023
tan([0, 1, -1]) // returns [0, 1.5574077246549023, -1.5574077246549023]
```
***
## _unique(_ _a_ _)_
Counts the number of unique values in an array


| Param | Type | Description |
| --- | --- | --- |
| a | <code>Array.&lt;any&gt;</code> | array of any values |

**Returns**: <code>number</code> - The number of unique values in the array. Returns 1 if `a` is not an array.  
**Example**  
```js
unique(100) // returns 1
unique([]) // returns 0
unique([1, 2, 3, 4]) // returns 4
unique([1, 2, 3, 4, 2, 2, 2, 3, 4, 2, 4, 5, 2, 1, 4, 2]) // returns 5
```
