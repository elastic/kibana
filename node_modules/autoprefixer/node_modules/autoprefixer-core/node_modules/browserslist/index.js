var caniuse = require('caniuse-db/data').agents;
var path    = require('path');
var fs      = require('fs');

var uniq = function (array) {
    var filtered = [];
    for ( var i = 0; i < array.length; i++ ) {
        if ( filtered.indexOf(array[i]) == -1 ) filtered.push(array[i]);
    }
    return filtered;
};

normalizeVersion = function (data, version) {
    if ( data.versions.indexOf(version) != -1 ) {
        return version;
    } else {
        var alias = browserslist.versionAliases[data.name][version];
        if ( alias ) return alias;
    }
};

// Return array of browsers by selection queries:
//
//   browserslist('IE >= 10, IE 8') //=> ['ie 11', 'ie 10', 'ie 8']
var browserslist = function (selections, opts) {
    if ( typeof(opts) == 'undefined' ) opts = { };

    if ( typeof(selections) == 'undefined' || selections === null ) {
        var config = browserslist.readConfig(opts.path);
        if ( config === false ) {
            selections = browserslist.defaults;
        } else {
            selections = config;
        }
    }

    if ( typeof(selections) == 'string' ) {
        selections = selections.split(/,\s*/);
    }

    var result = [];

    var query, match, array, used;
    selections.forEach(function (selection) {
        if ( selection.trim() === '' ) return;
        used = false;

        for ( var i in browserslist.queries ) {
            query = browserslist.queries[i];
            match = selection.match(query.regexp);
            if ( match ) {
                array  = query.select.apply(browserslist, match.slice(1));
                result = result.concat(array);
                used   = true;
                break;
            }
        }

        if ( !used ) {
            throw 'Unknown browser query `' + selection + '`';
        }
    });

    return uniq(result).sort(function (name1, name2) {
        name1 = name1.split(' ');
        name2 = name2.split(' ');
        if ( name1[0] == name2[0] ) {
            return parseFloat(name2[1]) - parseFloat(name1[1]);
        } else {
            return name1[0].localeCompare(name2[0]);
        }
    });
};

// Will be filled by Can I Use data below
browserslist.data  = { };
browserslist.usage = {
    global: { }
};

// Default browsers query
browserslist.defaults = [
    '> 1%',
    'last 2 versions',
    'Firefox ESR',
    'Opera 12.1'
];

// What browsers will be used in `last n version` query
browserslist.major = ['safari', 'opera', 'ios_saf', 'ie_mob', 'ie',
                      'firefox', 'chrome'];

// Browser names aliases
browserslist.aliases = {
    fx:             'firefox',
    ff:             'firefox',
    ios:            'ios_saf',
    explorer:       'ie',
    blackberry:     'bb',
    explorermobile: 'ie_mob',
    operamini:      'op_mini',
    operamobile:    'op_mob',
    chromeandroid:  'and_chr',
    firefoxandroid: 'and_ff'
};

// Aliases ot work with joined versions like `ios_saf 7.0-7.1`
browserslist.versionAliases = { };

// Get browser data by alias or case insensitive name
browserslist.byName = function (name) {
    name = name.toLowerCase();
    name = browserslist.aliases[name] || name;

    var data = browserslist.data[name];
    if ( !data ) throw 'Unknown browser ' + name;
    return data;
};

// Find config, read file and parse it
browserslist.readConfig = function (from) {
    if ( from === false )   return false;
    if ( !fs.readFileSync ) return false;
    if ( typeof(from) == 'undefined' ) from = '.';

    var dirs = path.resolve(from).split(path.sep);
    var config, stat;
    while ( dirs.length ) {
        config = dirs.concat(['browserslist']).join(path.sep);

        if ( fs.existsSync(config) && fs.lstatSync(config).isFile() ) {
            return browserslist.parseConfig( fs.readFileSync(config) );
        }

        dirs.pop();
    }

    return false;
};

// Return array of queries from config content
browserslist.parseConfig = function (string) {
    return string.toString()
                 .replace(/#[^\n]*/g, '')
                 .split(/\n/)
                 .map(function (i) {
                    return i.trim();
                 })
                 .filter(function (i) {
                    return i !== '';
                 });
};

browserslist.queries = {

    lastVersions: {
        regexp: /^last (\d+) versions?$/i,
        select: function (versions) {
            var selected = [];
            browserslist.major.forEach(function (name) {
                var data  = browserslist.byName(name);
                var array = data.released.slice(-versions);

                array = array.map(function (v) {
                    return data.name + ' ' + v;
                });
                selected = selected.concat(array);
            });
            return selected;
        }
    },

    lastByBrowser: {
        regexp: /^last (\d+) (\w+) versions?$/i,
        select: function (versions, name) {
            var data = browserslist.byName(name);
            return data.released.slice(-versions).map(function (v) {
                return data.name + ' ' + v;
            });
        }
    },

    globalStatistics: {
        regexp: /^> (\d+\.?\d*)%$/,
        select: function (popularity) {
            popularity = parseFloat(popularity);
            var result = [];

            for ( var version in browserslist.usage.global ) {
                if ( browserslist.usage.global[version] > popularity ) {
                    result.push(version);
                }
            }

            return result;
        }
    },

    countryStatistics: {
        regexp: /^> (\d+\.?\d*)% in (\w\w)$/,
        select: function (popularity, country) {
            popularity = parseFloat(popularity);
            country    = country.toUpperCase();
            var result = [];

            var usage = browserslist.usage[country];
            if ( !usage ) {
                usage = { };
                var data = require('caniuse-db/region-usage-json/' + country);
                for ( var i in data.data ) {
                    fillUsage(usage, i, data.data[i]);
                }
                browserslist.usage[country] = usage;
            }

            for ( var version in usage ) {
                if ( usage[version] > popularity ) {
                    result.push(version);
                }
            }

            return result;
        }
    },

    versions: {
        regexp: /^(\w+) (>=?|<=?)\s*([\d\.]+)/,
        select: function (name, sign, version) {
            var data = browserslist.byName(name);
            version  = parseFloat(version);

            var filter;
            if ( sign == '>' ) {
                filter = function (v) {
                    return parseFloat(v) > version;
                };
            } else if ( sign == '>=' ) {
                filter = function (v) {
                    return parseFloat(v) >= version;
                };
            } else if ( sign == '<' ) {
                filter = function (v) {
                    return parseFloat(v) < version;
                };
            } else if ( sign == '<=' ) {
                filter = function (v) {
                    return parseFloat(v) <= version;
                };
            }

            return data.released.filter(filter).map(function (v) {
                return data.name + ' ' + v;
            });
        }
    },

    esr: {
        regexp: /^(firefox|ff|fx) esr$/i,
        select: function (versions) {
            return ['firefox 31'];
        }
    },

    direct: {
        regexp: /^(\w+) ([\d\.]+)$/,
        select: function (name, version) {
            var data  = browserslist.byName(name);
            var alias = normalizeVersion(data, version);
            if ( alias ) {
                version = alias;
            } else {
                if ( version.indexOf('.') == -1 ) {
                    alias = version + '.0';
                } else if ( /\.0$/.test(version) ) {
                    alias = version.replace(/\.0$/, '');
                }
                alias = normalizeVersion(data, alias);
                if ( alias ) {
                    version = alias;
                } else {
                    throw 'Unknown version ' + version + ' of ' + name;
                }
            }

            return [data.name + ' ' + version];
        }
    }

};

// Get and convert Can I Use data

var normalize = function (versions) {
    return versions.filter(function (version) {
        return typeof(version) == 'string';
    });
};

var fillUsage = function (result, name, data) {
    for ( var i in data ) {
        result[name + ' ' + i] = data[i];
    }
};

for ( var name in caniuse ) {
    browserslist.data[name] = {
        name:     name,
        versions: normalize(caniuse[name].versions),
        released: normalize(caniuse[name].versions.slice(0, -3))
    };
    fillUsage(browserslist.usage.global, name, caniuse[name].usage_global);

    browserslist.versionAliases[name] = { };
    for ( var i = 0; i < caniuse[name].versions.length; i++ ) {
        if ( !caniuse[name].versions[i] ) continue;
        var full = caniuse[name].versions[i];

        if ( full.indexOf('-') != -1 ) {
            var interval = full.split('-');
            for ( var j = 0; j < interval.length; j++ ) {
                browserslist.versionAliases[name][ interval[j] ] = full;
            }
        }
    }
}

module.exports = browserslist;
