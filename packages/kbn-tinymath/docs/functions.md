# TinyMath Functions
This document provides detailed information about the functions available in Tinymath and lists what parameters each function accepts, the return value of that function, and examples of how each function behaves. Most of the functions below accept arrays and apply JavaScript Math methods to each element of that array. For the functions that accept multiple arrays as parameters, the function generally does calculation index by index. Any function below can be wrapped by another function as long as the return type of the inner function matches the acceptable parameter type of the outer function.

## _abs(_ _a_ _)_
Calculates the absolute value of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The absolute value of `a`. Returns an array with the the absolute values of each element if `a` is an array.  
**Example**  
```js
abs(-1) // returns 1
abs(2) // returns 2
abs([-1 , -2, 3, -4]) // returns [1, 2, 3, 4]
```
***
## _add(_ ..._args_ _)_
Calculates the sum of one or more numbers/arrays passed into the function. If at least one array of numbers is passed into the function, the function will calculate the sum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The sum of all numbers in `args` if `args` contains only numbers. Returns an array of sums of the elements at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.  
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

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cube root of `a`. Returns an array with the the cube roots of each element if `a` is an array.  
**Example**  
```js
cbrt(-27) // returns -3
cbrt(94) // returns 4.546835943776344
cbrt([27, 64, 125]) // returns [3, 4, 5]
```
***
## _ceil(_ _a_ _)_
Calculates the ceiling of a number, i.e. rounds a number towards positive infinity. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The ceiling of `a`. Returns an array with the the ceilings of each element if `a` is an array.  
**Example**  
```js
ceil(1.2) // returns 2
ceil(-1.8) // returns -1
ceil([1.1, 2.2, 3.3]) // returns [2, 3, 4]
```
***
## _clamp(_ ..._a_,  _min_,  _max_ _)_
Restricts value to a given range and returns closed available value. If only min is provided, values are restricted to only a lower bound.


| Param | Type | Description |
| --- | --- | --- |
| ...a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |
| min | <code>number</code> \| <code>Array.&lt;number&gt;</code> | The minimum value this function will return. |
| max | <code>number</code> \| <code>Array.&lt;number&gt;</code> | The maximum value this function will return. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The closest value between `min` (inclusive) and `max` (inclusive). Returns an array with values greater than or equal to `min` and less than or equal to `max` (if provided) at each index.  
**Throws**:

- `'Array length mismatch'` if `a`, `min`, and/or `max` are arrays of different lengths
- `'Min must be less than max'` if `max` is less than `min`
- `'Missing minimum value. You may want to use the 'max' function instead'` if min is not provided
- `'Missing maximum value. You may want to use the 'min' function instead'` if max is not provided

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
Performs an equality comparison between two values.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - Returns true if `a` and `b` are equal, false otherwise.  Returns an array with the equality comparison of each element if `a` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
eq(1, 1) // returns true
eq(1, 2) // returns false
eq([1, 2], 1) // returns [true, false]
eq([1, 2], [1, 2]) // returns [true, true]
```
***
## _gt(_ _a_,  _b_ _)_
Performs a greater than comparison between two values.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - Returns true if `a` is greater than `b`, false otherwise.  Returns an array with the greater than comparison of each element if `a` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
gt(1, 1) // returns false
gt(2, 1) // returns true
gt([1, 2], 1) // returns [true, false]
gt([1, 2], [2, 1]) // returns [false, true]
```
***
## _gte(_ _a_,  _b_ _)_
Performs a greater than or equal comparison between two values.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - Returns true if `a` is greater than or equal to `b`, false otherwise.  Returns an array with the greater than or equal comparison of each element if `a` is an array.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
gte(1, 1) // returns true
gte(1, 2) // returns false
gte([1, 2], 2) // returns [false, true]
gte([1, 2], [1, 1]) // returns [true, true]
```
***
## _ifelse(_ _cond_,  _a_,  _b_ _)_
Evaluates the a conditional argument and returns one of the two values based on that.


| Param | Type | Description |
| --- | --- | --- |
| cond | <code>boolean</code> | a boolean value |
| a | <code>any</code> \| <code>Array.&lt;any&gt;</code> | a value or an array of any values |
| b | <code>any</code> \| <code>Array.&lt;any&gt;</code> | a value or an array of any values |

**Returns**: <code>any</code> \| <code>Array.&lt;any&gt;</code> - if the value of cond is truthy, return `a`, otherwise return `b`.  
**Throws**:

- `'Condition clause is of the wrong type'` if the `cond` provided is not of boolean type
- `'Missing a value'` if `a` is not provided
- `'Missing b value'` if `b` is not provided

**Example**  
```js
ifelse(5 > 6, 1, 0) // returns 0
ifelse(1 == 1, [1, 2, 3], 5) // returns [1, 2, 3]
ifelse(1 < 2, [1, 2, 3], [2, 3, 4]) // returns [1, 2, 3]
```
***
## _lt(_ _a_,  _b_ _)_
Performs a lower than comparison between two values.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - Returns true if `a` is lower than `b`, false otherwise.  Returns an array with the lower than comparison of each element if `a` is an array.  
**Throws**:

- `'Missing b value'` if `b` is not provided
- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
lt(1, 1) // returns false
lt(1, 2) // returns true
lt([1, 2], 2) // returns [true, false]
lt([1, 2], [1, 2]) // returns [false, false]
```
***
## _lte(_ _a_,  _b_ _)_
Performs a lower than or equal comparison between two values.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>boolean</code> - Returns true if `a` is lower than or equal to `b`, false otherwise.  Returns an array with the lower than or equal comparison of each element if `a` is an array.  
**Throws**:

- `'Array length mismatch'` if `args` contains arrays of different lengths

**Example**  
```js
lte(1, 1) // returns true
lte(1, 2) // returns true
lte([1, 2], 2) // returns [true, true]
lte([1, 2], [1, 1]) // returns [true, false]
```
***
## _cos(_ _a_ _)_
Calculates the the cosine of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cosine of `a`. Returns an array with the the cosine of each element if `a` is an array.  
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

**Returns**: <code>number</code> - The length of the array. Returns 1 if `a` is not an array.  
**Throws**:

- `'Must pass an array'` if `a` is not an array

**Example**  
```js
count([]) // returns 0
count([-1, -2, -3, -4]) // returns 4
count(100) // returns 1
```
***
## _cube(_ _a_ _)_
Calculates the cube of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The cube of `a`. Returns an array with the the cubes of each element if `a` is an array.  
**Example**  
```js
cube(-3) // returns -27
cube([3, 4, 5]) // returns [27, 64, 125]
```
***
## _degtorad(_ _a_ _)_
Converts degrees to radians for a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in degrees. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The radians of `a`. Returns an array with the the radians of each element if `a` is an array.  
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
exp(2) // returns e^2 = 7.3890560989306495
exp([1, 2, 3]) // returns [e^1, e^2, e^3] = [2.718281828459045, 7.3890560989306495, 20.085536923187668]
```
***
## _first(_ _a_ _)_
Returns the first element of an array. If anything other than an array is passed in, the input is returned.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>Array.&lt;any&gt;</code> | array of any values |

**Returns**: <code>\*</code> - The first element of `a`. Returns `a` if `a` is not an array.  
**Example**  
```js
first(2) // returns 2
first([1, 2, 3]) // returns 1
```
***
## _fix(_ _a_ _)_
Calculates the fix of a number, i.e. rounds a number towards 0. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The fix of `a`. Returns an array with the the fixes for each element if `a` is an array.  
**Example**  
```js
fix(1.2) // returns 1
fix(-1.8) // returns -1
fix([1.8, 2.9, -3.7, -4.6]) // returns [1, 2, -3, -4]
```
***
## _floor(_ _a_ _)_
Calculates the floor of a number, i.e. rounds a number towards negative infinity. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The floor of `a`. Returns an array with the the floor of each element if `a` is an array.  
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
| a | <code>Array.&lt;any&gt;</code> | array of any values |

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
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` must be greater than 0 |
| b | <code>Object</code> | (optional) base for the logarithm. If not provided a value, the default base is e, and the natural log is calculated. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The logarithm of `a`. Returns an array with the the logarithms of each element if `a` is an array.  
**Throws**:

- `'Base out of range'` if `b` <= 0
- 'Must be greater than 0' if `a` > 0

**Example**  
```js
log(1) // returns 0
log(64, 8) // returns 2
log(42, 5) // returns 2.322344707681546
log([2, 4, 8, 16, 32], 2) // returns [1, 2, 3, 4, 5]
```
***
## _log10(_ _a_ _)_
Calculates the logarithm base 10 of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` must be greater than 0 |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The logarithm of `a`. Returns an array with the the logarithms base 10 of each element if `a` is an array.  
**Throws**:

- `'Must be greater than 0'` if `a` < 0

**Example**  
```js
log(10) // returns 1
log(100) // returns 2
log(80) // returns 1.9030899869919433
log([10, 100, 1000, 10000, 100000]) // returns [1, 2, 3, 4, 5]
```
***
## _max(_ ..._args_ _)_
Finds the maximum value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the maximum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The maximum value of all numbers if `args` contains only numbers. Returns an array with the the maximum values at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.  
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
Finds the mean value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the mean by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The mean value of all numbers if `args` contains only numbers. Returns an array with the the mean values of each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.  
**Example**  
```js
mean(1, 2, 3) // returns 2
mean([10, 20, 30, 40], 20) // returns [15, 20, 25, 30]
mean([1, 9], 5, [3, 4]) // returns [mean([1, 5, 3]), mean([9, 5, 4])] = [3, 6]
```
***
## _median(_ ..._args_ _)_
Finds the median value(s) of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the median by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The median value of all numbers if `args` contains only numbers. Returns an array with the the median values of each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.  
**Example**  
```js
median(1, 1, 2, 3) // returns 1.5
median(1, 1, 2, 2, 3) // returns 2
median([10, 20, 30, 40], 10, 20, 30) // returns [15, 20, 25, 25]
median([1, 9], 2, 4, [3, 5]) // returns [median([1, 2, 4, 3]), median([9, 2, 4, 5])] = [2.5, 4.5]
```
***
## _min(_ ..._args_ _)_
Finds the minimum value of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the minimum by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The minimum value of all numbers if `args` contains only numbers. Returns an array with the the minimum values of each index, including all scalar numbers in `args` in the calculation at each index if `a` is an array.  
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

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The remainder of `a` divided by `b` if both are numbers. Returns an array with the the remainders applied index-wise to each element if `a` or `b` is an array.  
**Throws**:

- `'Array length mismatch'` if `a` and `b` are arrays with different lengths
- `'Cannot divide by 0'` if `b` equals 0 or contains 0

**Example**  
```js
mod(10, 7) // returns 3
mod([11, 22, 33, 44], 10) // returns [1, 2, 3, 4]
mod(100, [3, 7, 11, 23]) // returns [1, 2, 1, 8]
mod([14, 42, 65, 108], [5, 4, 14, 2]) // returns [5, 2, 9, 0]
```
***
## _mode(_ ..._args_ _)_
Finds the mode value(s) of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the mode by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>Array.&lt;number&gt;</code> \| <code>Array.&lt;Array.&lt;number&gt;&gt;</code> - An array mode value(s) of all numbers if `args` contains only numbers. Returns an array of arrays with mode value(s) of each index, including all scalar numbers in `args` in the calculation at each index  if `args` contains at least one array.  
**Example**  
```js
mode(1, 1, 2, 3) // returns [1]
mode(1, 1, 2, 2, 3) // returns [1,2]
mode([10, 20, 30, 40], 10, 20, 30) // returns [[10], [20], [30], [10, 20, 30, 40]]
mode([1, 9], 1, 4, [3, 5]) // returns [mode([1, 1, 4, 3]), mode([9, 1, 4, 5])] = [[1], [4, 5, 9]]
```
***
## _multiply(_ _a_,  _b_ _)_
Multiplies two numbers. If at least one array of numbers is passed into the function, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The product of `a` and `b` if both are numbers. Returns an array with the the products applied index-wise to each element if `a` or `b` is an array.  
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
Returns the mathematical constant PI

**Returns**: <code>number</code> - The mathematical constant PI  
**Example**  
```js
pi() // 3.141592653589793
```
***
## _pow(_ _a_,  _b_ _)_
Raises a number to a given exponent. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> | the power that `a` is raised to |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - `a` raised to the power of `b`. Returns an array with the each element raised to the power of `b` if `a` is an array.  
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

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The degrees of `a`. Returns an array with the the degrees of each element if `a` is an array.  
**Example**  
```js
radtodeg(0) // returns 0
radtodeg(1.5707963267948966) // returns 90
radtodeg([0, 1.5707963267948966, 3.141592653589793, 6.283185307179586]) // returns [0, 90, 180, 360]
```
***
## _random(_ _a_,  _b_ _)_
Generates a random number within the given range where the lower bound is inclusive and the upper bound is exclusive. If no numbers are passed in, it will return a number between 0 and 1. If only one number is passed in, it will return .


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> | (optional) must be greater than 0 if `b` is not provided |
| b | <code>number</code> | (optional) must be greater |

**Returns**: <code>number</code> - A random number between 0 and 1 if no numbers are passed in. Returns a random number between 0 and `a` if only one number is passed in. Returns a random number between `a` and `b` if two numbers are passed in.  
**Throws**:

- `'Min is be greater than max'` if `a` < 0 when only `a` is passed in or if `a` > `b` when both `a` and `b` are passed in

**Example**  
```js
random() // returns a random number between 0 (inclusive) and 1 (exclusive)
random(10) // returns a random number between 0 (inclusive) and 10 (exclusive)
random(-10,10) // returns a random number between -10 (inclusive) and 10 (exclusive)
```
***
## _range(_ ..._args_ _)_
Finds the range of one of more numbers/arrays of numbers into the function. If at least one array of numbers is passed into the function, the function will find the range by index.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The range value of all numbers if `args` contains only numbers. Returns an array with the the range values at each index, including all scalar numbers in `args` in the calculation at each index if `args` contains at least one array.  
**Example**  
```js
range(1, 2, 3) // returns 2
range([10, 20, 30, 40], 15) // returns [5, 5, 15, 25]
range([1, 9], 4, [3, 5]) // returns [range([1, 4, 3]), range([9, 4, 5])] = [3, 5]
```
***
## _round(_ _a_,  _b_ _)_
Rounds a number towards the nearest integer by default or decimal place if specified. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |
| b | <code>number</code> | (optional) number of decimal places, default value: 0 |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The rounded value of `a`. Returns an array with the the rounded values of each element if `a` is an array.  
**Example**  
```js
round(1.2) // returns 2
round(-10.51) // returns -11
round(-10.1, 2) // returns -10.1
round(10.93745987, 4) // returns 10.9375
round([2.9234, 5.1234, 3.5234, 4.49234324], 2) // returns [2.92, 5.12, 3.52, 4.49]
```
***
## _sin(_ _a_ _)_
Calculates the the sine of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The sine of `a`. Returns an array with the the sine of each element if `a` is an array.  
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

**Returns**: <code>number</code> - The length of the array. Returns 1 if `a` is not an array.  
**Throws**:

- `'Must pass an array'` if `a` is not an array

**Example**  
```js
size([]) // returns 0
size([-1, -2, -3, -4]) // returns 4
size(100) // returns 1
```
***
## _sqrt(_ _a_ _)_
Calculates the square root of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The square root of `a`. Returns an array with the the square roots of each element if `a` is an array.  
**Throws**:

- `'Unable find the square root of a negative number'` if `a` < 0

**Example**  
```js
sqrt(9) // returns 3
sqrt(30) //5.477225575051661
sqrt([9, 16, 25]) // returns [3, 4, 5]
```
***
## _square(_ _a_ _)_
Calculates the square of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The square of `a`. Returns an array with the the squares of each element if `a` is an array.  
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
subtract([14, 42, 65, 108], [2, 7, 5, 12]) // returns [12, 35, 52, 96]
```
***
## _sum(_ ..._args_ _)_
Calculates the sum of one or more numbers/arrays passed into the function. If at least one array is passed, the function will sum up one or more numbers/arrays of numbers and distinct values of an array. Sum accepts arrays of different lengths.


| Param | Type | Description |
| --- | --- | --- |
| ...args | <code>number</code> \| <code>Array.&lt;number&gt;</code> | one or more numbers or arrays of numbers |

**Returns**: <code>number</code> - The sum of one or more numbers/arrays of numbers including distinct values in arrays  
**Example**  
```js
sum(1, 2, 3) // returns 6
sum([10, 20, 30, 40], 10, 20, 30) // returns 160
sum([1, 2], 3, [4, 5], 6) // returns sum(1, 2, 3, 4, 5, 6) = 21
sum([10, 20, 30, 40], 10, [1, 2, 3], 22) // returns sum(10, 20, 30, 40, 10, 1, 2, 3, 22) = 138
```
***
## _tan(_ _a_ _)_
Calculates the the tangent of a number. For arrays, the function will be applied index-wise to each element.


| Param | Type | Description |
| --- | --- | --- |
| a | <code>number</code> \| <code>Array.&lt;number&gt;</code> | a number or an array of numbers, `a` is expected to be given in radians. |

**Returns**: <code>number</code> \| <code>Array.&lt;number&gt;</code> - The tangent of `a`. Returns an array with the the tangent of each element if `a` is an array.  
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
