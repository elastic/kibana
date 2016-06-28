Leaflet.draw Changelog
======================

## master

An in-progress version being developed on the master branch.

## 0.2.4 (February 04, 2014)

### Improvements

 * Add support for toolbar touch styles. (by [@alanshaw](https://github.com/alanshaw)). [#269](https://github.com/Leaflet/Leaflet.draw/pull/269 )
 * Add support for maintaining a layers color when entering edit mode.
 * Add support for showing area when drawing a rectangle.
 * Refactor marker editing to bring in line with path editing handlers. Decouple setting editing style from edit toolbar. (by [@manleyjster](https://github.com/manleyjster)). [#323](https://github.com/Leaflet/Leaflet.draw/pull/323)
 * Prevent skewing on selected edit marker. (by [@kyletolle](https://github.com/kyletolle)). [#341](https://github.com/Leaflet/Leaflet.draw/pull/341)
 * Add support for changing the 'Radius' label text.

### Bugfixes

 * Fix deleted layers LayerGroup constructor type. (by [@w8r ](https://github.com/w8r )). [#334](https://github.com/Leaflet/Leaflet.draw/pull/334)

## 0.2.3 (January 14, 2014)

### Improvements

 * Restrict editing polygons so that at least 3 points are present. (by [@Zverik](https://github.com/Zverik)). [#200](https://github.com/Leaflet/Leaflet.draw/pull/200)
 * Tooltips initially start hidden until the mouse has been moved. (by [@Zverik](https://github.com/Zverik)). [#210](https://github.com/Leaflet/Leaflet.draw/pull/210)
 * Fixup spelling errors. (by [@nexushoratio](https://github.com/nexushoratio)). [#223](https://github.com/Leaflet/Leaflet.draw/pull/223)
 * Combine ie specific style within leaflet.draw.css stylesheet. (by [@frankrowe](https://github.com/frankrowe)). [#221](https://github.com/Leaflet/Leaflet.draw/pull/221)
 * Improve my terrible engrish. (by [@erictheise](https://github.com/erictheise)). [#237](https://github.com/Leaflet/Leaflet.draw/pull/237)
 * Fire `editstart` events when a poly or simple shape is initially edited. (by [@atombender](https://github.com/atombender)). [#245](https://github.com/Leaflet/Leaflet.draw/pull/245)
 * Add ability to add a new vertex to a polyline or polygon hander.
 * Added ability to remove/undo the last placed point for polyline or polygons. (by [@Zverik](https://github.com/Zverik)). [#242](https://github.com/Leaflet/Leaflet.draw/pull/242)
 * Dynamically position the action toolbars. (by [@DevinClark](https://github.com/DevinClark)). [#240](https://github.com/Leaflet/Leaflet.draw/pull/240)
 * Improve polyline/polygon drawing by accepting some motion on click. (by [@atombender](https://github.com/atombender)). [#249](https://github.com/Leaflet/Leaflet.draw/pull/249)
 * Only draw a limited number of guide dashes to improve performance in some rare cases. [#254](https://github.com/Leaflet/Leaflet.draw/pull/254)

### Bugfixes

 * Fix edit toolbar so diabled state is represented correctly. (by [@joeybaker](https://github.com/joeybaker)). [#203](https://github.com/Leaflet/Leaflet.draw/pull/203)
 * Fixed path middle marker positions. (by [@Zverik](https://github.com/Zverik)). [#208](https://github.com/Leaflet/Leaflet.draw/pull/208)
 * Fix issue where toolbar buttons would have focus after clicked so couldn't use escape to cancel until clicked map at least once.
 * Fix toolbar icons for retina displays. (by [@dwnoble](https://github.com/dwnoble)). [#217](https://github.com/Leaflet/Leaflet.draw/pull/217)
 * Ensure that options are not shared between draw handler classes. (by [@yohanboniface](https://github.com/yohanboniface)). [#219](https://github.com/Leaflet/Leaflet.draw/pull/219)
 * Fix bug where multiple handlers could be active. (by [@manubb](https://github.com/manubb)). [#247](https://github.com/Leaflet/Leaflet.draw/pull/247)

## 0.2.2 (October 4, 2013)

### Improvements

 * Refactored the `L.drawLocal' object to be better structured and use this object whereever text is used. *NOTE: THIS IS A NEW FORMAT, SO WILL BRESK ANY EXISTING CUSTOM `L.drawLocal` SETTINGS*.
 * Added Imperial measurements to compliment the existing Metric measurements when drawing a polyline or polygon.
 * Added `draw:editstart` and `draw:editstop` events. (by [@bhell](https://github.com/bhell)). [#175](https://github.com/Leaflet/Leaflet.draw/pull/175)
 * Added `repeatMode` option that will allow repeated drawing of features. (by [@jayhogan](https://github.com/jayhogan) and [@cscheid](https://github.com/cscheid)). [#178](https://github.com/Leaflet/Leaflet.draw/pull/178)
 * Added abilit to set circle radius measurement to imperial units.
 * Added disabled state for edit/delete buttons when no layers present. (inspired by [@snkashis](https://github.com/snkashis)). [#136](https://github.com/Leaflet/Leaflet.draw/pull/136)
 * Add `showLength` and `showRadius` options to circle and polyline. (by [@Zverik](https://github.com/Zverik)). [#195](https://github.com/Leaflet/Leaflet.draw/pull/195)
 * Add option to disable tooltips. (by [@Zverik](https://github.com/Zverik)). [#196](https://github.com/Leaflet/Leaflet.draw/pull/196)

### Bugfixes

 * Fixed bug where edit handlers could not be disabled.
 * Added support for displaying the toolbar on the right hand side of the map. (by [@paulcpederson](https://github.com/paulcpederson)). [#164](https://github.com/Leaflet/Leaflet.draw/pull/164)
 * Add flexible width action buttons. (by [@Grsmto](https://github.com/Grsmto)). [#181](https://github.com/Leaflet/Leaflet.draw/pull/181)
 * Check for icon existence before disabling edit state. (by [@tmcw](https://github.com/tmcw)). [#182](https://github.com/Leaflet/Leaflet.draw/pull/182)
 * Only update guideslines when guidelines are present. (by [@jayhogan](https://github.com/jayhogan)). [#188](https://github.com/Leaflet/Leaflet.draw/pull/188)
 * Fixes to localization code so it can be correctly set after files have been loaded.
 * Fix for firing `draw:edit` twice for Draw.SimpleShape. (by [@cazacugmihai](https://github.com/cazacugmihai)). [#192](https://github.com/Leaflet/Leaflet.draw/pull/192)
 * Fix last edit menu buttons from wrapping. (by [@moiarcsan](https://github.com/moiarcsan)). [#198](https://github.com/Leaflet/Leaflet.draw/pull/198)

## 0.2.1 (July 5, 2013)

### Improvements

 * `draw:edited` now returns a `FeatureGroup` of features edited. (by [@jmkelly](https://github.com/jmkelly)). [#95](https://github.com/Leaflet/Leaflet.draw/pull/95)
 * Circle tooltip shows the radius (in m) while drawing.
 * Added Leaflet version check to inform developers that Leaflet 0.6+ is required.
 * Added ability to finish drawing polygons by double clicking. (inspired by [@snkashis](https://github.com/snkashis)). [#121](https://github.com/Leaflet/Leaflet.label/pull/121)
 * Added test environment. (by [@iirvine](https://github.com/iirvine)). [#123](https://github.com/Leaflet/Leaflet.draw/pull/123)
 * Added `L.drawLocal` object to allow users to customize the text used in the plugin. Addresses localization issues. (by [@Starefossen](https://github.com/Starefossen)). [#87](https://github.com/Leaflet/Leaflet.draw/pull/87)
 * Added ability to disable edit mode path and marker styles. (inspired by [@markgibbons25](https://github.com/markgibbons25)). [#121](https://github.com/Leaflet/Leaflet.label/pull/137)
 * Added area calculation when drawing a polygon.
 * Polyline and Polygon tooltips update on click as well as mouse move.

### Bugfixes

 * Fixed issue where removing a vertex or adding a new one via midpoints would not update the edited state for polylines and polygons.
 * Fixed issue where not passing in the context to `off()` would result in the event from not being unbound.(by [@koppelbakje](https://github.com/koppelbakje)). [#95](https://github.com/Leaflet/Leaflet.draw/pull/112)
 * Fixed issue where removing the draw control from the map would result in an error.
 * Fixed bug where removing points created by dragging midpoints would cause the polyline to not reflect any newly created points.
 * Fixed regression where handlers were not able to be disabled.(by [@yohanboniface](https://github.com/yohanboniface)). [#139](https://github.com/Leaflet/Leaflet.draw/pull/139)
 * Fixed bug where L.Draw.Polyline would try to remove a non-existant handler if the user cancelled and the polyline only had a single point.

## 0.2.0 (February 20, 2013)

Major new version. Added Edit toolbar which allows editing and deleting shapes.

### Features

 * Consistant event for shape creation. (by [@krikrou](https://github.com/krikrou)). [#58](https://github.com/Leaflet/Leaflet.draw/pull/58)

### Bugfixes

 * Fixed adding markers over vector layers. (by [@Starefossen](https://github.com/Starefossen)). [#82](https://github.com/Leaflet/Leaflet.draw/pull/82)

## 0.1.7 (February 11, 2013)

 * Add sanity check for toolbar buttons when adding top and bottom classes. (by [@yohanboniface](https://github.com/yohanboniface)). [#60](https://github.com/Leaflet/Leaflet.draw/pull/60)

## 0.1.6 (January 17, 2013)

* Updated toolbar styles to be in line with the new Leaflet zoom in/out styles.

## 0.1.5 (December 10, 2012)

### Features

 * Added 'drawing-disabled' event fired on the map when a draw handler is disabled. (by [@ajbeaven](https://github.com/thegreat)). [#35](https://github.com/jacobtoye/Leaflet.draw/pull/35)
 * Added 'drawing' event fired on the map when a draw handler is actived. (by [@ajbeaven](https://github.com/thegreat)). [#30](https://github.com/jacobtoye/Leaflet.draw/pull/30)

### Bugfixes
 
 * Stopped L.Control.Draw from storing handlers in it's prototype. (by [@thegreat](https://github.com/thegreat)). [#37](https://github.com/jacobtoye/Leaflet.draw/pull/37)

## 0.1.4 (October 8, 2012)

### Bugfixes

 * Fixed a bug that would cause an error when creating rectangles/circles withought moving the mouse. (by [@inpursuit](https://github.com/inpursuit)). [#25](https://github.com/jacobtoye/Leaflet.draw/pull/25)
 * Fixed a bug that would cause an error when clicking a different drawing tool while another mode enabled. (by [@thegreat](https://github.com/thegreat)). [#27](https://github.com/jacobtoye/Leaflet.draw/pull/27)
 * Fixed control buttons breaking plugin in oldIE.
 * Fixed drawing polylines and polygons in oldIE.

## 0.1.3 (October 3, 2012)

### Bugfixes

 * Tip label will now show over vertex markers.
 * Added ability to draw on top of existing markers and vector layers.
 * Clicking on a map object that has a click handler no longer triggers the click event when in drawing mode.

## Pre-0.1.3

Check the commit history for changes previous to 0.1.3.
