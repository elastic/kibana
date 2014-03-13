/*global module, test, equals, expect, ok, printStackTrace, CapturedExceptions */
//
//     Copyright (C) 2008 Loic Dachary <loic@dachary.org>
//     Copyright (C) 2008 Johan Euphrosine <proppy@aminche.com>
//     Copyright (C) 2010 Eric Wendelin <emwendelin@gmail.com>
//
//     This program is free software: you can redistribute it and/or modify
//     it under the terms of the GNU General Public License as published by
//     the Free Software Foundation, either version 3 of the License, or
//     (at your option) any later version.
//
//     This program is distributed in the hope that it will be useful,
//     but WITHOUT ANY WARRANTY; without even the implied warranty of
//     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//     GNU General Public License for more details.
//
//     You should have received a copy of the GNU General Public License
//     along with this program.  If not, see <http://www.gnu.org/licenses/>.
//

// Setup a mapping to stacktrace for the unit tests
require.config({
	paths: {
		'stacktrace': '../stacktrace'
	}
});

(function(window, document, undefined) {
    module("AMD invocation");

    test("printStackTrace", function() {
        expect(1);
        stop();
        require(['stacktrace'], function(printStackTrace) {
        	var r = printStackTrace();
       		equals(r.constructor, Array, 'printStackTrace returns an array');
       		start();
        });
    });
})(window, document);

// Start QUnit since we set autostart to false
QUnit.start();