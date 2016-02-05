## Timelion function reference
This is the timelion function reference. Please note this document is auto generated from the Timelion code. Do not submit pulls against this document. You want to submit a pull against something in the `series_functions/` directory.

### Data sources
#### .es()
Pull data from an elasticsearch instance

##### Arguments
**q** (*string*) *optional*: Query in lucene query string syntax  
**metric** (*string*) *optional*: An elasticsearch single value metric agg, eg avg, sum, min, max or cardinality, followed by a field. Eg "sum:bytes"  
**index** (*string*) *optional*: Index to query, wildcards accepted  
**timefield** (*string*) *optional*: Field of type "date" to use for x-axis  
**interval** (*string*) *optional*: **DO NOT USE THIS**. Its fun for debugging fit functions, but you really should use the interval picker  
**url** (*string*) *optional*: Elasticsearch server URL, eg http://localhost:9200  
**offset** (*string*) *optional*: Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
**fit** (*string*) *optional*: Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .graphite()
Pull data from grahite. Configure your graphite server in timelion.json

##### Arguments
**metric** (*string*): Graphite metric to pull, eg _test-data.users.*.data  
**offset** (*string*) *optional*: Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
**fit** (*string*) *optional*: Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .quandl()
Pull data from quandl.com using the quandl code

##### Arguments
**code** (*string*) *optional*: The quandl code to plot. You can find these on quandl.com.  
**position** (*number*) *optional*: Some quandl sources return multiple series, which one should I use? 1 based index.  
**offset** (*string*) *optional*: Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
**fit** (*string*) *optional*: Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .worldbank_indicators()
Pull data from http://data.worldbank.org/ using the country name and indicator. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

##### Arguments
**country** (*string*) *optional*: Worldbank country identifier. Usually the country's 2 letter code  
**indicator** (*string*) *optional*: The indicator code to use. You'll have to look this up on data.worldbank.org. Often pretty obtuse. Eg SP.POP.TOTL is population  
**offset** (*string*) *optional*: Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
**fit** (*string*) *optional*: Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .worldbank()
Pull data from http://data.worldbank.org/ using path to series. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

##### Arguments
**code** (*string*) *optional*: Worldbank API path. This is usually everything after the domain, before the querystring. Eg: /en/countries/ind;chn/indicators/DPANUSSPF.  
**offset** (*string*) *optional*: Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
**fit** (*string*) *optional*: Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

### Chainable functions
#### .abs()
Return the absolute value of each value in the series list

##### Arguments
No arguments for this function.

#### .bars()
Show the seriesList as bars

##### Arguments
**width** (*number*) *optional*: Width of bars in pixels  

#### .color()
Change the color of the series

##### Arguments
**color** (*string*): Color of series, as hex, eg #c6c6c6 is a lovely light grey.  

#### .cusum()
Return the cumulative sum of a series, starting at a base.

##### Arguments
**base** (*number*): Number to start at. Basically just adds this to the beginning of the series  

#### .derivative()
Show the seriesList as bars

##### Arguments
No arguments for this function.

#### .divide()
Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**divisor** (*seriesList, number*): Number or series to divide by. If passing a seriesList it must contain exactly 1 series.  

#### .first()
This is an internal function that simply returns the input seriesList. Don't use this

##### Arguments
No arguments for this function.

#### .hide()
Hide the series by default

##### Arguments
**hide** (*boolean*) *optional*: Hide or unhide the series  

#### .label()
Change the label of the series. Use %s reference the existing label

##### Arguments
**label** (*string*): Legend value for series. You can use %s to reference to current label.  

#### .legend()
Set the position and style of the legend on the plot

##### Arguments
**position** (*string*) *optional*: Corner to place the legend in: nw, ne, se, or sw  
**columns** (*number*) *optional*: Number of columns to divide the legend into  

#### .lines()
Show the seriesList as lines

##### Arguments
**width** (*number*) *optional*: Line thickness  
**fill** (*number*) *optional*: Number between 0 and 10. Use for making area charts  
**show** (*number*) *optional*: Show or hide lines  
**steps** (*number*) *optional*: Show line as step, eg, do not interpolate between points  

#### .max()
Maximum values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**value** (*seriesList, number*): Number, series to max with the input series. If passing a seriesList it must contain exactly 1 series.  

#### .min()
Minimum values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**value** (*seriesList, number*): Number, series to min with the input series. If passing a seriesList it must contain exactly 1 series.  

#### .movingaverage()
Calculate the moving average over a given window. Nice for smoothing noisey series

##### Arguments
**window** (*number*): Number of points to average over  
**position** (*string*) *optional*: Position of the averaged points relative to the result time.  Options are left, right, and center (default).  

#### .movingstd()
Calculate the moving standard deviation over a given window. Uses naive two-pass algorithm. Rounding errors may become more noticeable with very long series, or series with very large numbers.

##### Arguments
**window** (*number*): Number of points to compute the standard deviation over  

#### .multiply()
Multiply the values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**multiplier** (*seriesList, number*): Number or series by which to multiply. If passing a seriesList it must contain exactly 1 series.  

#### .points()
Show the series as points

##### Arguments
**radius** (*number*) *optional*: Size of points  
**weight** (*number*) *optional*: Thickness of line around point  
**fill** (*number*) *optional*: Number between 0 and 10 representing opacity of fill  
**fillColor** (*string*) *optional*: Color with which to fill point  
**symbol** (*string*) *optional*: cross, circle, triangle, square or diamond  
**show** (*boolean*) *optional*: Show points or not  

#### .precision()
number of digits to round the decimal portion of the value to

##### Arguments
**precision** (*number*): Number of digits to round each value to  

#### .subtract()
Subtract the values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**term** (*seriesList, number*): Number or series to subtract from input. If passing a seriesList it must contain exactly 1 series.  

#### .sum()
Adds the values of one or more series in a seriesList to each position, in each series, of the input seriesList

##### Arguments
**term** (*seriesList, number*): Number or series to sum with the input series. If passing a seriesList it must contain exactly 1 series.  

#### .testcast()
Use holt-winters to forecast values. Basically useless. I have no idea how this works.

##### Arguments
**count** (*number*)  
**alpha** (*number*)  
**beta** (*number*)  
**gamma** (*number*)  

#### .yaxis()
This is an internal function that simply returns the input series. Don't use this

##### Arguments
**yaxis** (*number*) *optional*: The numbered y-axis to plot this series on, eg .yaxis(2) for a 2nd y-axis.  
**min** (*number*) *optional*: Min value  
**max** (*number*) *optional*: Max value  
**position** (*string*) *optional*: left or right  

