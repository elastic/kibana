
function MockChild () {
    mockChildProcesses.push(this);
    this.stdout = {
        on: sinon.spy()
    };
    this.stderr = {
        on: sinon.spy()
    };
    this.on = sinon.spy();
}

function MockChildProcess () {
    mockChildProcess = this;
    this.spawn = sinon.spy(function () {
        return new MockChild();
    });
}

function Instance (baseDir) {
    var Git = require('../src/git');

    return git = new Git(baseDir, new MockChildProcess, sinon.spy());
}

function closeWith (data) {
    var stdout = mockChildProcesses[mockChildProcesses.length - 1].stdout.on.args[0][1];
    var close = mockChildProcesses[mockChildProcesses.length - 1].on.args[0][1];

    stdout(data);
    close(0);
}

function theCommandRun() {
    return mockChildProcess.spawn.args[0][1];
}

var sinon = require('sinon'), sandbox;
var git, mockChildProcess, mockChildProcesses = [];

exports.setUp = function (done) {
    sandbox = sinon.sandbox.create();
    done();
};

exports.tearDown = function (done) {
    git = mockChildProcess = null;
    mockChildProcesses = [];
    sandbox.restore();
    done();
};

exports.status = {
    setUp: function (done) {
        Instance();
        done();
    },

    'empty status': function (test) {
        git.status(function (err, status) {
            test.equals(0, status.created,      'No new files');
            test.equals(0, status.deleted,      'No removed files');
            test.equals(0, status.modified,     'No modified files');
            test.equals(0, status.not_added,    'No untracked files');
            test.done();
        });

        test.equals(1, mockChildProcesses.length, 'Spawns one process per task');
        closeWith('');
    },

    'modified status': function (test) {
        git.status(function (err, status) {
            test.equals(3, status.created.length,      'No new files');
            test.equals(0, status.deleted.length,      'No removed files');
            test.equals(2, status.modified.length,     'No modified files');
            test.equals(1, status.not_added.length,    'No un-tracked files');
            test.done();
        });

        test.equals(1, mockChildProcesses.length, 'Spawns one process per task');
        closeWith(' M package.json\n\
        M src/git.js\n\
        AM src/index.js \n\
        A src/newfile.js \n\
        AM test.js\n\
        ?? test/ \n\
        ');
    }
};

exports.commit = {
    setUp: function (done) {
        Instance();
        done();
    },

    'commit with single file specified': function (test) {
        git.commit('some message', 'fileName.ext', function (err, commit) {
            test.equals('unitTests', commit.branch, 'Should be on unitTests branch');
            test.equals('44de1ee', commit.commit, 'Should pick up commit hash');
            test.equals(3, commit.summary.changes, 'Should pick up changes count');
            test.equals(12, commit.summary.deletions, 'Should pick up deletions count');
            test.equals(29, commit.summary.insertions, 'Should pick up insertions count');

            test.same(
                ["commit", "-m", "some message", "fileName.ext"],
                theCommandRun());

            test.done();
        });

        closeWith('[unitTests 44de1ee] Add nodeunit test runner\n\
        3 files changed, 29 insertions(+), 12 deletions(-)\n\
        create mode 100644 src/index.js');
    },

    'commit with multiple files specified': function (test) {
        git.commit('some message', ['fileName.ext', 'anotherFile.ext'], function (err, commit) {

            test.equals('branchNameInHere', commit.branch, 'Should pick up branch name');
            test.equals('CommitHash', commit.commit, 'Should pick up commit hash');
            test.equals(3, commit.summary.changes, 'Should pick up changes count');
            test.equals(12, commit.summary.deletions, 'Should pick up deletions count');
            test.equals(29, commit.summary.insertions, 'Should pick up insertions count');

            test.same(
                ["commit", "-m", "some message", "fileName.ext", "anotherFile.ext"],
                theCommandRun());

            test.done();
        });

        closeWith('[branchNameInHere CommitHash] Add nodeunit test runner\n\
        3 files changed, 29 insertions(+), 12 deletions(-)\n\
        create mode 100644 src/index.js');
    },

    'commit with no files specified': function (test) {
        git.commit('some message', function (err, commit) {

            test.equals('branchNameInHere', commit.branch, 'Should pick up branch name');
            test.equals('CommitHash', commit.commit, 'Should pick up commit hash');
            test.equals(3, commit.summary.changes, 'Should pick up changes count');
            test.equals(12, commit.summary.deletions, 'Should pick up deletions count');
            test.equals(10, commit.summary.insertions, 'Should pick up insertions count');

            test.same(
                ["commit", "-m", "some message"],
                theCommandRun());

            test.done();
        });

        closeWith('[branchNameInHere CommitHash] Add nodeunit test runner\n\
        3 files changed, 10 insertions(+), 12 deletions(-)\n\
        create mode 100644 src/index.js');
    }
};

exports.revParse = {
    setUp: function (done) {
        Instance();
        git.silent(false);
        sandbox.stub(console, 'warn');
        done();
    },

    'deprecated usage': function (test) {
        var then = sinon.spy();
        git.revparse('HEAD', then);

        closeWith('');
        test.ok(then.calledOnce);
        test.ok(then.calledWith(null, ''));
        test.ok(console.warn.calledOnce);

        test.done();
    },

    'valid usage': function (test) {
        var then = sinon.spy();
        git.revparse(['HEAD'], then);

        closeWith('');
        test.ok(then.calledOnce);
        test.ok(then.calledWith(null, ''));
        test.ok(console.warn.notCalled);
        test.done();
    },

    'called with a string': function (test) {
        git.revparse('some string');
        test.same(
            ["rev-parse", "some", "string"],
            theCommandRun());
        test.done();
    },

    'called with an array of strings': function (test) {
        git.revparse(['another', 'string']);
        test.same(
            ["rev-parse", "another", "string"],
            theCommandRun());
        test.done();
    }
};
