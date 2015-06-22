var test = require('tape');
var tar = require('../index');
var fixtures = require('./fixtures');
var concat = require('concat-stream');
var fs = require('fs');

var clamp = function(index, len, defaultValue) {
	if (typeof index !== 'number') return defaultValue;
	index = ~~index;  // Coerce to integer.
	if (index >= len) return len;
	if (index >= 0) return index;
	index += len;
	if (index >= 0) return index;
	return 0;
};

test('one-file', function(t) {
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	extract.on('entry', function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'test.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'hello world\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.ONE_FILE_TAR));
});

test('chunked-one-file', function(t) {
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	extract.on('entry', function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'test.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'hello world\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	var b = fs.readFileSync(fixtures.ONE_FILE_TAR);

	for (var i = 0; i < b.length; i += 321) {
		extract.write(b.slice(i, clamp(i+321, b.length, b.length)));
	}
	extract.end();
});


test('multi-file', function(t) {
	t.plan(5);

	var extract = tar.extract();
	var noEntries = false;

	var onfile1 = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'file-1.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		extract.on('entry', onfile2);
		stream.pipe(concat(function(data) {
			t.same(data.toString(), 'i am file-1\n');
			callback();
		}));
	};

	var onfile2 = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'file-2.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'i am file-2\n');
			callback();
		}));
	};

	extract.once('entry', onfile1);

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.MULTI_FILE_TAR));
});

test('chunked-multi-file', function(t) {
	t.plan(5);

	var extract = tar.extract();
	var noEntries = false;

	var onfile1 = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'file-1.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		extract.on('entry', onfile2);
		stream.pipe(concat(function(data) {
			t.same(data.toString(), 'i am file-1\n');
			callback();
		}));
	};

	var onfile2 = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'file-2.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 12,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'i am file-2\n');
			callback();
		}));
	};

	extract.once('entry', onfile1);

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	var b = fs.readFileSync(fixtures.MULTI_FILE_TAR);
	for (var i = 0; i < b.length; i += 321) {
		extract.write(b.slice(i, clamp(i+321, b.length, b.length)));
	}
	extract.end();
});

test('types', function(t) {
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	var ondir = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'directory',
			mode: 0755,
			uid: 501,
			gid: 20,
			size: 0,
			mtime: new Date(1387580181000),
			type: 'directory',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});
		stream.on('data', function() {
			t.ok(false);
		});
		extract.once('entry', onlink);
		callback();
	};

	var onlink = function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'directory-link',
			mode: 0755,
			uid: 501,
			gid: 20,
			size: 0,
			mtime: new Date(1387580181000),
			type: 'symlink',
			linkname: 'directory',
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});
		stream.on('data', function() {
			t.ok(false);
		});
		noEntries = true;
		callback();
	};

	extract.once('entry', ondir);

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.TYPES_TAR));
});

test('long-name', function(t) {
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	extract.on('entry', function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'my/file/is/longer/than/100/characters/and/should/use/the/prefix/header/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/foobarbaz/filename.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 16,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'hello long name\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.LONG_NAME_TAR));
});

test('unicode-bsd', function(t) { // can unpack a bsdtar unicoded tarball
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	extract.on('entry', function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'høllø.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 4,
			mtime: new Date(1387588646000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'hej\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.UNICODE_BSD_TAR));
});

test('unicode', function(t) { // can unpack a bsdtar unicoded tarball
	t.plan(3);

	var extract = tar.extract();
	var noEntries = false;

	extract.on('entry', function(header, stream, callback) {
		t.deepEqual(header, {
			name: 'høstål.txt',
			mode: 0644,
			uid: 501,
			gid: 20,
			size: 8,
			mtime: new Date(1387580181000),
			type: 'file',
			linkname: null,
			uname: 'maf',
			gname: 'staff',
			devmajor: 0,
			devminor: 0
		});

		stream.pipe(concat(function(data) {
			noEntries = true;
			t.same(data.toString(), 'høllø\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(noEntries);
	});

	extract.end(fs.readFileSync(fixtures.UNICODE_TAR));
});

test('name-is-100', function(t) {
	t.plan(3);

	var extract = tar.extract();

	extract.on('entry', function(header, stream, callback) {
		t.same(header.name.length, 100);

		stream.pipe(concat(function(data) {
			t.same(data.toString(), 'hello\n');
			callback();
		}));
	});

	extract.on('finish', function() {
		t.ok(true);
	});

	extract.end(fs.readFileSync(fixtures.NAME_IS_100_TAR));
});

test('invalid-file', function(t) {
	t.plan(1);

	var extract = tar.extract();

	extract.on('error', function(err) {
		t.ok(!!err);
		extract.destroy();
	});

	extract.end(fs.readFileSync(fixtures.INVALID_TGZ));
});

test('space prefixed', function(t) {
	t.plan(5);

	var extract = tar.extract();

	extract.on('entry', function(header, stream, callback) {
		t.ok(true)
		callback();
	});

	extract.on('finish', function() {
		t.ok(true);
	});

	extract.end(fs.readFileSync(fixtures.SPACE_TAR_GZ));
});
