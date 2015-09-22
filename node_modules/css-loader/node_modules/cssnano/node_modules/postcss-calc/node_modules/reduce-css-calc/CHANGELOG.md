# 1.2.0 - 2014-11-24

* Decimal precision is now customisable as the `precision` option

# 1.1.4 - 2014-11-12

* 5 decimals rounding for everything

# 1.1.3 - 2014-08-13

* 5 decimals rounding for percentage

# 1.1.2 - 2014-08-10

* Prevent infinite loop by adding a `Call stack overflow`
* Correctly ignore unrecognized values (safer evaluation for nested expressions, see [postcss/postcss-calc#2](https://github.com/postcss/postcss-calc/issues/2))
* Handle rounding issues (eg: 10% * 20% now give 2%, not 2.0000000000000004%)

# 1.1.1 - 2014-08-06

* Fix issue when using mutiples differents prefixes in the same function

# 1.1.0 - 2014-08-06

* support more complex formulas
* use `reduce-function-call`
* better error message


# 1.0.0 - 2014-08-04

First release

- based on [rework-calc](https://github.com/reworkcss/rework-calc) v1.1.0
- add error if the calc() embed an empty calc() or empty ()
- jscs + jshint added before tests
