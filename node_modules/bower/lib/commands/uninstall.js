var mout = require('mout');
var Q = require('q');
var Project = require('../core/Project');
var cli = require('../util/cli');
var Tracker = require('../util/analytics').Tracker;
var defaultConfig = require('../config');

function uninstall(logger, names, options, config) {
    var project;
    var tracker;

    options = options || {};
    config = defaultConfig(config);
    project = new Project(config, logger);
    tracker = new Tracker(config);

    tracker.trackNames('uninstall', names);

    return project.getTree(options)
    .spread(function (tree, flattened) {
        // Uninstall nodes
        return project.uninstall(names, options)
        // Clean out non-shared uninstalled dependencies
        .then(function (uninstalled) {
            var names = Object.keys(uninstalled);
            var children = [];

            // Grab the dependencies of packages that were uninstalled
            mout.object.forOwn(flattened, function (node) {
                if (names.indexOf(node.endpoint.name) !== -1) {
                    children.push.apply(children, mout.object.keys(node.dependencies));
                }
            });

            // Clean them!
            return clean(project, children, uninstalled);
        });
    });
}

function clean(project, names, removed) {
    removed = removed || {};

    return project.getTree()
    .spread(function (tree, flattened) {
        var nodes = [];
        var dependantsCounter = {};

        // Grab the nodes of each specified name
        mout.object.forOwn(flattened, function (node) {
            if (names.indexOf(node.endpoint.name) !== -1) {
                nodes.push(node);
            }
        });

        // Walk the down the tree, gathering dependants of the packages
        project.walkTree(tree, function (node, nodeName) {
            if (names.indexOf(nodeName) !== -1) {
                dependantsCounter[nodeName] = dependantsCounter[nodeName] || 0;
                dependantsCounter[nodeName] += node.nrDependants;
            }
        }, true);


        // Filter out those that have no dependants
        nodes = nodes.filter(function (node) {
            return !dependantsCounter[node.endpoint.name];
        });

        // Are we done?
        if (!nodes.length) {
            return Q.resolve(removed);
        }

        // Grab the nodes after filtering
        names = nodes.map(function (node) {
            return node.endpoint.name;
        });

        // Uninstall them
        return project.uninstall(names)
        // Clean out non-shared uninstalled dependencies
        .then(function (uninstalled) {
            var children;

            mout.object.mixIn(removed, uninstalled);

            // Grab the dependencies of packages that were uninstalled
            children = [];
            nodes.forEach(function (node) {
                children.push.apply(children, mout.object.keys(node.dependencies));
            });

            // Recurse!
            return clean(project, children, removed);
        });
    });
}

// -------------------

uninstall.line = function (logger, argv) {
    var options = uninstall.options(argv);
    var names = options.argv.remain.slice(1);

    if (!names.length) {
        return new Q();
    } else {
        return uninstall(logger, names, options);
    }
};

uninstall.options = function (argv) {
    return cli.readOptions({
        'save': { type: Boolean, shorthand: 'S' },
        'save-dev': { type: Boolean, shorthand: 'D' }
    }, argv);
};

uninstall.completion = function () {
    // TODO:
};

module.exports = uninstall;
