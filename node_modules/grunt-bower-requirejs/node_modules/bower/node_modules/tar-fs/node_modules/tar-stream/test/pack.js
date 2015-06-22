var test = require('tape');
var tar = require('../index');
var fixtures = require('./fixtures');
var concat = require('concat-stream');
var fs = require('fs');

test('one-file', function(t) {
	t.plan(2);

	var pack = tar.pack();

	pack.entry({
		name:'test.txt',
		mtime:new Date(1387580181000),
		mode:0644,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	}, 'hello world\n');

	pack.finalize();

	pack.pipe(concat(function(data) {
		t.same(data.length & 511, 0);
		t.deepEqual(data, fs.readFileSync(fixtures.ONE_FILE_TAR));
	}));
});

test('multi-file', function(t) {
	t.plan(2);

	var pack = tar.pack();

	pack.entry({
		name:'file-1.txt',
		mtime:new Date(1387580181000),
		mode:0644,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	}, 'i am file-1\n');

	pack.entry({
		name:'file-2.txt',
		mtime:new Date(1387580181000),
		mode:0644,
		size:12,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	}).end('i am file-2\n');

	pack.finalize();

	pack.pipe(concat(function(data) {
		t.same(data.length & 511, 0);
		t.deepEqual(data, fs.readFileSync(fixtures.MULTI_FILE_TAR));
	}));
});

test('types', function(t) {
	t.plan(2);
	var pack = tar.pack();

	pack.entry({
		name:'directory',
		mtime:new Date(1387580181000),
		type:'directory',
		mode:0755,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	});

	pack.entry({
		name:'directory-link',
		mtime:new Date(1387580181000),
		type:'symlink',
		linkname: 'directory',
		mode:0755,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	});

	pack.finalize();

	pack.pipe(concat(function(data) {
		t.equal(data.length & 511, 0);
		t.deepEqual(data, fs.readFileSync(fixtures.TYPES_TAR));
	}));

});

test('long-name', function(t) {
	t.plan(2);
	var pack = tar.pack();

	pack.entry({
		name:'my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt',
		mtime:new Date(1387580181000),
		type:'file',
		mode:0644,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	}, 'hello long name\n');

	pack.finalize();

	pack.pipe(concat(function(data) {
		t.equal(data.length & 511, 0);
		t.deepEqual(data, fs.readFileSync(fixtures.LONG_NAME_TAR));
	}));
});

test('unicode', function(t) {
	t.plan(2);
	var pack = tar.pack();

	pack.entry({
		name:'høstål.txt',
		mtime:new Date(1387580181000),
		type:'file',
		mode:0644,
		uname:'maf',
		gname:'staff',
		uid:501,
		gid:20
	}, 'høllø\n');

	pack.finalize();

	pack.pipe(concat(function(data) {
		t.equal(data.length & 511, 0);
		t.deepEqual(data, fs.readFileSync(fixtures.UNICODE_TAR));
	}));
});