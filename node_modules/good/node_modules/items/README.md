#items

Bare minimum async methods adapted specifically for the very limited **hapi** core use cases. Use
[async](https://github.com/caolan/async) for all your application needs.

[![Build Status](https://secure.travis-ci.org/hapijs/items.png)](http://travis-ci.org/hapijs/items)

Lead Maintainer - [Raquel Vélez](https://github.com/rockbot)

## `Items.serial(items, method, callback)`

Runs `method` against each value in the `items` array *in series*. `callback` is executed when all of the tasks are complete. Calling back with an error will short-circuit the remaining tasks.

- `items` an array of items to pass to `method`.
- `method` a function with the signature `function (item, next)`.
    - `item` - is the currently processing item in the `items` array.
    - `next` - callback function to indicate the end of processing for `item`. Calling `next` with a truthy parameter indicates an error and ends `Items.serial`.
- `callback` - a function with the signature `function (err)`.
    - `err` - indicates any errors during processing.

## `Items.parallel(items, method, callback)`

Runs `method` against each value in the `items` array *in parallel*. `callback` is executed when all of the tasks are complete. Calling back with an error will short-circuit the remaining tasks.

- `items` an array of items to pass to `method`.
- `method` a function with the signature `function (item, next)`.
    - `item` - is the currently processing item in the `items` array.
    - `next` - callback function to indicate the end of processing for `item`. Calling `next` with a truthy parameter indicates an error and ends `Items.serial`.
- `callback` - a function with the signature `function (err)`.
    - `err` - indicates any errors during processing.

## `Items.parallel.execute(tasks, callback)`

Runs all of the functions in `tasks` *in parallel* and stores the results in a collector object passed into `callback`. If any of the tasks callback with an error, the collector object is `null`.

- `tasks` - on object containing functions to execute in parallel. The `key` of the function is the `key` in the result of collector object. The task should have the signature `function (next)`
    - `next(err, result)` - callback function to indicate the end of processing for the current task.
        - `err` - indicates any errors during processing.
        - `result` - result of this function. This value will be set on the collector object in the final callback.
- `callback(err, result)`
    - `err` - any errors reported by *any* of the `tasks`.
    - `result` - an object containing the result of running all of the `tasks`. `result` will be `null` if any of the tasks callback with an error. The `result.key` will be the corresponding `key` of the `tasks` object.