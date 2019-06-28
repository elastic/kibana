# Deprecation notice

This package is set for deprecation and is actively being removed from Kibana.

The Kibana UI framework is a collection of React elements and Sass styles used to build legacy layouts in Kibana. It was
primarily used during the 5.x and 6.x versions and is replaced by the [Elastic UI framework](https://elastic.github.io/eui/).
Portions of Kibana still utilize this package and until it is fully removed you can still compile and view the
documentation using the instructions below.

## Compiling KUI and viewing the docs

Compile the CSS with `./node_modules/grunt/bin/grunt uiFramework:compileCss` (OS X) or
`.\node_modules\grunt\bin\grunt uiFramework:compileCss` (Windows).

You can view interactive documentation by running `yarn uiFramework:start` and then visiting
[http://localhost:8020/](http://localhost:8020/). This will also start watching the SCSS files, and will recompile the CSS
automatically for you when you make changes.

You can run `node scripts/jest --watch` to watch for changes and run the tests as you code.

You can run `node scripts/jest --coverage` to generate a code coverage report to see how
fully-tested the code is.

See the documentation in [`scripts/jest.js`](../scripts/jest.js) for more options.