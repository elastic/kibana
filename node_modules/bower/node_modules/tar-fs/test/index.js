var test = require('tape')
var rimraf = require('rimraf')
var tar = require('../index')
var path = require('path')
var fs = require('fs')
var os = require('os')

var win32 = os.platform() === 'win32'

test('copy a -> copy/a', function(t) {
  t.plan(5)

  var a = path.join(__dirname, 'fixtures', 'a')
  var b = path.join(__dirname, 'fixtures', 'copy', 'a')

  rimraf.sync(b)
  tar.pack(a)
    .pipe(tar.extract(b))
    .on('finish', function() {
      var files = fs.readdirSync(b)
      t.same(files.length, 1)
      t.same(files[0], 'hello.txt')
      var fileB = path.join(b, files[0])
      var fileA = path.join(a, files[0])
      t.same(fs.readFileSync(fileB, 'utf-8'), fs.readFileSync(fileA, 'utf-8'))
      t.same(fs.statSync(fileB).mode, fs.statSync(fileA).mode)
      t.same(fs.statSync(fileB).mtime.getTime(), fs.statSync(fileA).mtime.getTime())
    })
})

test('copy b -> copy/b', function(t) {
  t.plan(8)

  var a = path.join(__dirname, 'fixtures', 'b')
  var b = path.join(__dirname, 'fixtures', 'copy', 'b')

  rimraf.sync(b)
  tar.pack(a)
    .pipe(tar.extract(b))
    .on('finish', function() {
      var files = fs.readdirSync(b)
      t.same(files.length, 1)
      t.same(files[0], 'a')
      var dirB = path.join(b, files[0])
      var dirA = path.join(a, files[0])
      t.same(fs.statSync(dirB).mode, fs.statSync(dirA).mode)
      t.same(fs.statSync(dirB).mtime.getTime(), fs.statSync(dirA).mtime.getTime())
      t.ok(fs.statSync(dirB).isDirectory())
      var fileB = path.join(dirB, 'test.js')
      var fileA = path.join(dirA, 'test.js')
      t.same(fs.readFileSync(fileB, 'utf-8'), fs.readFileSync(fileA, 'utf-8'))
      t.same(fs.statSync(fileB).mode, fs.statSync(fileA).mode)
      t.same(fs.statSync(fileB).mtime.getTime(), fs.statSync(fileA).mtime.getTime())
    })
})

test('symlink', function(t) {
  if (win32) { // no symlink support on win32 currently. TODO: test if this can be enabled somehow
    t.plan(1)
    t.ok(true)
    return
  }

  t.plan(5)

  var a = path.join(__dirname, 'fixtures', 'c')

  rimraf.sync(path.join(a, 'link'))
  fs.symlinkSync('.gitignore', path.join(a, 'link'))

  var b = path.join(__dirname, 'fixtures', 'copy', 'c')

  rimraf.sync(b)
  tar.pack(a)
    .pipe(tar.extract(b))
    .on('finish', function() {
      var files = fs.readdirSync(b).sort()
      t.same(files.length, 2)
      t.same(files[0], '.gitignore')
      t.same(files[1], 'link')

      var linkA = path.join(a, 'link')
      var linkB = path.join(b, 'link')

      t.same(fs.lstatSync(linkB).mtime.getTime(), fs.lstatSync(linkA).mtime.getTime())
      t.same(fs.readlinkSync(linkB), fs.readlinkSync(linkA))
    })
})

test('strip', function(t) {
  t.plan(2)

  var a = path.join(__dirname, 'fixtures', 'b')
  var b = path.join(__dirname, 'fixtures', 'copy', 'b-strip')

  rimraf.sync(b)

  tar.pack(a)
    .pipe(tar.extract(b, {strip:1}))
    .on('finish', function() {
        var files = fs.readdirSync(b).sort()
        t.same(files.length, 1)
        t.same(files[0], 'test.js')
    })
})

test('strip + map', function(t) {
  t.plan(2)

  var a = path.join(__dirname, 'fixtures', 'b')
  var b = path.join(__dirname, 'fixtures', 'copy', 'b-strip')

  rimraf.sync(b)

  var uppercase = function(header) {
    header.name = header.name.toUpperCase()
    return header
  }

  tar.pack(a)
    .pipe(tar.extract(b, {strip:1, map:uppercase}))
    .on('finish', function() {
        var files = fs.readdirSync(b).sort()
        t.same(files.length, 1)
        t.same(files[0], 'TEST.JS')
    })
})