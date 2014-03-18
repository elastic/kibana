# K4D3
D3 Visualization Library for Kibana 4!

## Environment Setup
1. Fork the repository. You will need node, npm, bower, and grunt installed.

  a. Install node and npm.

  b. To install Bower, run:

  ```bash
  npm install -g bower
  ```

  c. To install Grunt, run:

  ```bash
  npm install -g grunt cli
  ```

2. Change into the project's root directory.

```bash
npm install
```

Run Grunt with `grunt`. That's it!

## Directory Structure
Despite the fact that this may be obvious, I always find a directory layout helpful.

1. `docs/` - visualization library documentation.
2. `examples/` - example code for creating charts.
3. `lib/` - third party dependencies.
4. `src/` - source code.
5. `tests/` - unit tests.
6. `.bowerrc` - bower configuration file.
7. `.gitignore` - list of files/directories for git to ignore.
8. `.jshintrc` - jshint configurations.
9. `GruntFile.js` - Grunt configuration file.
10. `bower.json` - bower dependencies list.
11. `index.html` - list of charting examples.
12. `kd3.css` - concatenated css code.
13. `kd3.min.css` - minified, concatenated css code.
14. `k4.d3.js` - concatenated source code.
15. `k4.d3.min.js` - minified, concatenated source code.
16. `karma.conf.js` - Karma configuration file for testing.
17. `package.json` - npm config file with (Grunt) development dependencies.

