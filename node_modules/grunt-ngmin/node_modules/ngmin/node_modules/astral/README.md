# Astral

AST tooling framework for JavaScript focused on modularity and performance.
The goal is to make it easy to create, share, and combine tools that operate on ASTs.
The architecture inspired by llvm.

## How it Works

Various [passes](https://github.com/btford/astral-pass) are registered in Astral.
Esprima (parser) creates AST.
Astral runs the passes in order based on their prerequisites.

## Install

`npm install astral`

## Example

```javascript
var esprima = require('esprima');
var escodegen = require('escodegen');

var astral = require('astral')();
var myPass = require('astral-pass')();

myPass.name = 'myPass';

myPass.
  when({
    // ... AST chunk
  }).
  when(function (chunk, info) {
    // return true or false
  }).
  transform(function (chunk, info) {

  });

astral.register(myPass);

var ast = esprima.parse('var x = 42;');

var newAst = astral.run(ast);

var newSrc = escodegen.generate(newAst);

console.log(newSrc);
```

## Writing a Pass

A pass is just an object with three properties:

```
var myPass = {
  name: 'my:pass',
  prereqs: [],
  run: function (ast, info) {
    return {};
  }
}
```

### name
The name of the pass. Used to reference prereqs and info.

### prereqs
An array of passes expected to be run before this pass is run.

### run
The function for transforming the AST. It takes two arguments: `ast`, and `info`. It should return an `info` object to be associated with this pass.

## Why?

Source transform tools all have to solve the same problems:

1. read the file(s)
2. parse the code into an AST
3. look for interesting features
4. modify the AST
5. generate code
6. save the code back to a file(s)

Using multiple code transform tools results in a lot of expensive, repeated work.
Items 1-2 and 5-6 above are usually *exactly* the same across tools,
and 3-4 are often implemented with similar, generic algorithms using different parameters or slightly different behaviors.

Astral is a framework that lets you plug in a set of "passes" that do steps 3-4,
while generically sharing the rest of the process.

### What about...
How does Astral compare to these projects?

#### [Falafel](https://github.com/substack/node-falafel)
Falafel is a lib for doing source transforms.
You could use it inside of an Astral pass.

#### [Rocambole](https://github.com/millermedeiros/rocambole/)
Rocambole is like Falafel: a tool for making the changes.
Again, it'd be great to make use of this library inside of a pass.

#### [Browserify](https://github.com/substack/node-browserify)
Browserify is a tool that does source code transforms as a module/build solution.
Browserify has the option to include your own transforms that get run before Browserify transforms CommonJS-style modules into a format that's more suitable for web browsers.
The downside of this system is that you can't easily use these transforms if you're not using Browserify.
Ideally, Browserify could be built on top of Astral.

#### [ngmin](https://github.com/btford/ngmin)
ngmin does transforms on AngularJS apps to make the source easier to minify.
Ideally, ngmin could also be built on top of Astral.
The advantage to this is that it would be easier and faster to combine a build process using both ngmin and Browserify.
Currently, both of these tools separately read files, parse into an AST, generate code form the AST, and save back to a file.

#### [Grunt](http://gruntjs.com/)
Grunt is a task runner.
It is often used as a build tool, concatenating and minifying files.
Grunt typically runs on a per-file basis, which makes it great for a wide variety of cases, but a poor choice for source transforms since you typically end up reading/writing the same file multiple times.
You can think of Astral as "Grunt tasks, but for ASTs instead of files."
You could write a Grunt task to run Astral passes to integrate the two.

## License
MIT
