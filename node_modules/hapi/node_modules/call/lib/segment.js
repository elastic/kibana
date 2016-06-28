// Load modules

var Hoek = require('hoek');
var Boom = require('boom');


// Declare internals

var internals = {};


exports = module.exports = internals.Segment = function () {

    this._edge = null;              // { segment, record }
    this._fulls = null;             // { path: { segment, record }
    this._literals = null;          // { literal: { segment, <node> } }
    this._param = null;             // <node>
    this._mixed = null;             // [{ segment, <node> }]
    this._wildcard = null;          // { segment, record }
};


internals.Segment.prototype.add = function (segments, record) {

    /*
        { literal: 'x' }        -> x
        { empty: false }        -> {p}
        { wildcard: true }      -> {p*}
        { mixed: /regex/ }      -> a{p}b
    */

    var current = segments[0];
    var remaining = segments.slice(1);
    var isEdge = !remaining.length;

    var literals = [];
    for (var i = 0, il = segments.length, isLiteral = true; i < il && isLiteral; ++i) {
        isLiteral = segments[i].literal !== undefined;
        literals.push(segments[i].literal);
    }

    if (isLiteral) {
        this._fulls = this._fulls || {};
        var literal = '/' + literals.join('/');
        if (!record.settings.isCaseSensitive) {
            literal = literal.toLowerCase();
        }

        Hoek.assert(!this._fulls[literal], 'New route', record.path, 'conflicts with existing', this._fulls[literal] && this._fulls[literal].record.path);
        this._fulls[literal] = { segment: current, record: record };
    }
    else if (current.literal !== undefined) {               // Can be empty string

        // Literal

        this._literals = this._literals || {};
        var literal = (record.settings.isCaseSensitive ? current.literal : current.literal.toLowerCase());
        this._literals[literal] = this._literals[literal] || new internals.Segment();
        this._literals[literal].add(remaining, record);
    }
    else if (current.wildcard) {

        // Wildcard

        Hoek.assert(!this._wildcard, 'New route', record.path, 'conflicts with existing', this._wildcard && this._wildcard.record.path);
        Hoek.assert(!this._param || !this._param._wildcard, 'New route', record.path, 'conflicts with existing', this._param && this._param._wildcard && this._param._wildcard.record.path)
        this._wildcard = { segment: current, record: record };
    }
    else if (current.mixed) {

        // Mixed

        this._mixed = this._mixed || [];

        var mixed = this._mixedLookup(current);
        if (!mixed) {
            mixed = { segment: current, node: new internals.Segment() };
            this._mixed.push(mixed);
            this._mixed.sort(internals.mixed);
        }

        if (isEdge) {
            Hoek.assert(!mixed.node._edge, 'New route', record.path, 'conflicts with existing', mixed.node._edge && mixed.node._edge.record.path);
            mixed.node._edge = { segment: current, record: record };
        }
        else {
            mixed.node.add(remaining, record);
        }
    }
    else {

        // Parameter

        this._param = this._param || new internals.Segment();

        if (isEdge) {
            Hoek.assert(!this._param._edge, 'New route', record.path, 'conflicts with existing', this._param._edge && this._param._edge.record.path);
            this._param._edge = { segment: current, record: record };
        }
        else {
            Hoek.assert(!this._wildcard || !remaining[0].wildcard, 'New route', record.path, 'conflicts with existing', this._wildcard && this._wildcard.record.path)
            this._param.add(remaining, record);
        }
    }
};


internals.Segment.prototype._mixedLookup = function (segment) {

    for (var i = 0, il = this._mixed.length; i < il; ++i) {
        if (internals.mixed({ segment: segment }, this._mixed[i]) === 0) {
            return this._mixed[i];
        }
    }

    return null;
};


internals.mixed = function (a, b) {

    var aFirst = -1;
    var bFirst = 1;

    var as = a.segment;
    var bs = b.segment;

    if (as.length !== bs.length) {
        return (as.length > bs.length ? aFirst : bFirst);
    }

    if (as.first !== bs.first) {
        return (as.first ? bFirst : aFirst);
    }

    for (var j = 0, jl = as.segments.length ; j < jl; ++j) {
        var am = as.segments[j];
        var bm = bs.segments[j];

        if (am === bm) {
            continue;
        }

        if (am.length === bm.length) {
            return (am > bm ? bFirst : aFirst);
        }

        return (am.length < bm.length ? bFirst : aFirst);
    }

    return 0;
};


internals.Segment.prototype.lookup = function (path, segments, options) {

    var match = null;

    // Literal edge

    if (this._fulls) {
        match = this._fulls[options.isCaseSensitive ? path : path.toLowerCase()];
        if (match) {
            return { record: match.record, array: [] };
        }
    }

    // Literal node

    var current = segments[0];
    var nextPath = path.slice(current.length + 1)
    var remainder = (segments.length > 1 ? segments.slice(1) : null);

    if (this._literals) {
        match = this._literals[options.isCaseSensitive ? current : current.toLowerCase()];
        if (match) {
            var record = internals.deeper(match, nextPath, remainder, [], options);
            if (record) {
                return record;
            }
        }
    }

    // Mixed

    if (this._mixed) {
        for (var i = 0, il = this._mixed.length; i < il; ++i) {
            match = this._mixed[i];
            var params = current.match(match.segment.mixed);
            if (params) {
                var array = [];
                for (var p = 1, pl = params.length; p < pl; ++p) {
                    array.push(params[p]);
                }

                var record = internals.deeper(match.node, nextPath, remainder, array, options);
                if (record) {
                    return record;
                }
            }
        }
    }

    // Param

    if (this._param) {
        if (current ||
            !this._param._edge ||
            this._param._edge.segment.empty) {

            var record = internals.deeper(this._param, nextPath, remainder, [current], options);
            if (record) {
                return record;
            }
        }
    }

    // Wildcard

    if (this._wildcard) {
        return { record: this._wildcard.record, array: [path.slice(1)] };
    }

    return null;
};


internals.deeper = function (match, path, segments, array, options) {

    if (!segments) {
        if (match._edge) {
            return { record: match._edge.record, array: array };
        }

        if (match._wildcard) {
            return { record: match._wildcard.record, array: array }
        }
    }
    else {
        var result = match.lookup(path, segments, options);
        if (result) {
            return { record: result.record, array: array.concat(result.array) };
        }
    }

    return null;
};
