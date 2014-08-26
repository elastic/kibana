/*global expect, describe, it, beforeEach, runs, waitsFor, require, d3, dimple */
(function () {
    "use strict";

    describe("using RequireJS with Dimple", function () {
        describe("when requiring the module", function () {
            it("returns a valid dimple object", function () {
                // arrange
                var dimpleInstanceLoadedFromModule = null;

                // act
                runs(function () {
                    require(["dimple"], function (dimple) {
                        dimpleInstanceLoadedFromModule = dimple;
                    });
                });

                // assert
                waitsFor(function () {
                    return dimpleInstanceLoadedFromModule;
                }, "the asynchronous module to load", 3000);

                runs(function () {
                    expect(dimpleInstanceLoadedFromModule).toBeDefined();
                    expect(dimpleInstanceLoadedFromModule.version).toBeDefined();
                });
            });

            it("ensures that dimple is available in the global namespace (for backwards compatibility)", function () {
                // arrange
                var dimpleInstanceLoadedFromModule = null;

                // act
                runs(function () {
                    require(["dimple"], function (dimple) {
                        dimpleInstanceLoadedFromModule = dimple;
                    });
                });

                // assert
                waitsFor(function () {
                    return dimpleInstanceLoadedFromModule;
                }, "the asynchronous module to load", 3000);

                runs(function () {
                    expect(dimple).toBeDefined();
                });
            });
        });
    });
}());