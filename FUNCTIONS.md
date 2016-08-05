## Timelion function reference
This document is auto generated from the timelion code. Do not submit pulls against this document. You want to submit a pull against something in the `series_functions/` directory.

### Data sources
Data sources can start a chain, they don't need to be attached to anything, but they still need to start with a `.` (dot). Data retreived from a data source can be passed into the chainable functions in the next section.

#### .graphite()
Pull data from graphite. Configure your graphite server in timelion.json

Argument | Accepts | Description
--- | --- | ---
metric | *string* | Graphite metric to pull, eg _test-data.users.*.data  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

#### .quandl()
Pull data from quandl.com using the quandl code. Stick your free API key in timelion.json. API is rate limited without a key

Argument | Accepts | Description
--- | --- | ---
code | *string* | The quandl code to plot. You can find these on quandl.com.  
position | *number* | Some quandl sources return multiple series, which one should I use? 1 based index.  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

#### .static()
Draws a single value across the chart

Argument | Accepts | Description
--- | --- | ---
value | *number/string* | The single value to to display, you can also pass several values and I will interpolate them evenly across your time range.  
label | *string* | A quick way to set the label for the series. You could also use the .label() function  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

#### .worldbank_indicators()
Pull data from http://data.worldbank.org/ using the country name and indicator. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

Argument | Accepts | Description
--- | --- | ---
country | *string* | Worldbank country identifier. Usually the country's 2 letter code  
indicator | *string* | The indicator code to use. You'll have to look this up on data.worldbank.org. Often pretty obtuse. Eg SP.POP.TOTL is population  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

#### .worldbank()
Pull data from http://data.worldbank.org/ using path to series. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

Argument | Accepts | Description
--- | --- | ---
code | *string* | Worldbank API path. This is usually everything after the domain, before the querystring. Eg: /en/countries/ind;chn/indicators/DPANUSSPF.  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

#### .es()
Pull data from an elasticsearch instance

Argument | Accepts | Description
--- | --- | ---
q | *string* | Query in lucene query string syntax  
metric | *string* | An elasticsearch single value metric agg, eg avg, sum, min, max or cardinality, followed by a field. Eg "sum:bytes", or just "count"  
split | *string* | An elasticsearch field to split the series on and a limit. Eg, "hostname:10" to get the top 10 hostnames  
index | *string* | Index to query, wildcards accepted  
timefield | *string* | Field of type "date" to use for x-axis  
kibana | *boolean* | Respect filters on Kibana dashboards. Only has an effect when using on Kibana dashboards  
interval | *string* | **DO NOT USE THIS**. Its fun for debugging fit functions, but you really should use the interval picker  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, carry, nearest, none, scale,   

### Chainable functions
Chainable functions can not start a chain. Somewhere before them must be a data source function. Chainable functions modify the data output directly from a data source, or from another chainable function that has a data source somewhere before it.

#### .abs()
Return the absolute value of each value in the series list

*This function does not accept any arguments.*

#### .bars()
Show the seriesList as bars

Argument | Accepts | Description
--- | --- | ---
width | *number* | Width of bars in pixels  
stack | *boolean* | Should bars be stacked, true by default  

#### .color()
Change the color of the series

Argument | Accepts | Description
--- | --- | ---
color | *string* | Color of series, as hex, eg #c6c6c6 is a lovely light grey. If you specify multiple colors, and have multiple series, you will get a gradient, eg "#00B1CC:#00FF94:#FF3A39:#CC1A6F"  

#### .condition()
Compares each point to a number, or the same point in another series using an operator, then sets its valueto the result if the condition proves true, with an optional else.

Argument | Accepts | Description
--- | --- | ---
operator | *string* | Operator to use for comparison, valid operators are eq (equal), ne (not equal), lt (less than), lte (less than equal), gt (greater than), gte (greater than equal)  
if | *number/seriesList* | The value to which the point will be compared. If you pass a seriesList here the first series will be used  
then | *number/seriesList* | The value the point will be set to if the comparison is true. If you pass a seriesList here the first series will be used  
else | *number/seriesList* | The value the point will be set to if the comparison is false. If you pass a seriesList here the first series will be used  

#### .cusum()
Return the cumulative sum of a series, starting at a base.

Argument | Accepts | Description
--- | --- | ---
base | *number* | Number to start at. Basically just adds this to the beginning of the series  

#### .derivative()
Plot the change in values over time.

*This function does not accept any arguments.*

#### .divide()
Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
divisor | *seriesList/number* | Number or series to divide by. If passing a seriesList it must contain exactly 1 series.  

#### .first()
This is an internal function that simply returns the input seriesList. Don't use this

*This function does not accept any arguments.*

#### .fit()
Fills null values using a defined fit function

Argument | Accepts | Description
--- | --- | ---
mode | *string* | The algorithm to use for fitting the series to the target. One of: average, carry, nearest, none, scale,   

#### .hide()
Hide the series by default

Argument | Accepts | Description
--- | --- | ---
hide | *boolean* | Hide or unhide the series  

#### .label()
Change the label of the series. Use %s reference the existing label

Argument | Accepts | Description
--- | --- | ---
label | *string* | Legend value for series. You can use $1, $2, etc, in the string to match up with the regex capture groups  
regex | *string* | A regex with capture group support  

#### .legend()
Set the position and style of the legend on the plot

Argument | Accepts | Description
--- | --- | ---
position | *string/boolean* | Corner to place the legend in: nw, ne, se, or sw. You can also pass false to disable the legend  
columns | *number* | Number of columns to divide the legend into  

#### .lines()
Show the seriesList as lines

Argument | Accepts | Description
--- | --- | ---
width | *number* | Line thickness  
fill | *number* | Number between 0 and 10. Use for making area charts  
stack | *boolean* | Stack lines, often misleading. At least use some fill if you use this.  
show | *number/boolean* | Show or hide lines  
steps | *number/boolean* | Show line as step, eg, do not interpolate between points  

#### .max()
Maximum values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
value | *seriesList/number* | Sets the point to whichever is higher, the existing value, or the one passed. If passing a seriesList it must contain exactly 1 series.  

#### .min()
Minimum values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
value | *seriesList/number* | Sets the point to whichever is lower, the existing value, or the one passed. If passing a seriesList it must contain exactly 1 series.  

#### .movingaverage()
Calculate the moving average over a given window. Nice for smoothing noisey series

Argument | Accepts | Description
--- | --- | ---
window | *number* | Number of points to average over  
position | *string* | Position of the averaged points relative to the result time.  Options are left, right, and center (default).  

#### .movingstd()
Calculate the moving standard deviation over a given window. Uses naive two-pass algorithm. Rounding errors may become more noticeable with very long series, or series with very large numbers.

Argument | Accepts | Description
--- | --- | ---
window | *number* | Number of points to compute the standard deviation over  

#### .multiply()
Multiply the values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
multiplier | *seriesList/number* | Number or series by which to multiply. If passing a seriesList it must contain exactly 1 series.  

#### .points()
Show the series as points

Argument | Accepts | Description
--- | --- | ---
radius | *number* | Size of points  
weight | *number* | Thickness of line around point  
fill | *number* | Number between 0 and 10 representing opacity of fill  
fillColor | *string* | Color with which to fill point  
symbol | *string* | cross, circle, triangle, square or diamond  
show | *boolean* | Show points or not  

#### .precision()
number of digits to round the decimal portion of the value to

Argument | Accepts | Description
--- | --- | ---
precision | *number* | Number of digits to round each value to  

#### .props()
Use at your own risk, sets arbitrary properties on the series. For example .props(label=bears!)

Argument | Accepts | Description
--- | --- | ---
global | *boolean* | Set props on the seriesList vs on each series  

#### .range()
Changes the max and min of a series while keeping the same shape

Argument | Accepts | Description
--- | --- | ---
min | *number* | New minimum value  
max | *number* | New maximum value  

#### .scale_interval()
Changes scales a value (usually a sum or a count) to a new interval. For example, as a per-second rate

Argument | Accepts | Description
--- | --- | ---
interval | *string* | The new interval in date math notation, eg 1s for 1 second. 1m, 5m, 1M, 1w, 1y, etc.  

#### .subtract()
Subtract the values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
term | *seriesList/number* | Number or series to subtract from input. If passing a seriesList it must contain exactly 1 series.  

#### .sum()
Adds the values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
term | *seriesList/number* | Number or series to sum with the input series. If passing a seriesList it must contain exactly 1 series.  

#### .title()
Adds a title to the top of the plot. If called on more than 1 seriesList the last call will be used.

Argument | Accepts | Description
--- | --- | ---
title | *string* | Title for the plot.  

#### .trim()
Set N buckets at the start or end of a series to null to fit the "partial bucket issue"

Argument | Accepts | Description
--- | --- | ---
start | *number* | Buckets to trim from the beginning of the series. Default: 1  
end | *number* | Buckets to trim from the end of the series. Default: 1  

#### .yaxis()
Configures a variety of y-axis options, the most important likely being the ability to add an Nth (eg 2nd) y-axis

Argument | Accepts | Description
--- | --- | ---
yaxis | *number* | The numbered y-axis to plot this series on, eg .yaxis(2) for a 2nd y-axis.  
min | *number* | Min value  
max | *number* | Max value  
position | *string* | left or right  
label | *string* | Label for axis  
color | *string* | Color of axis label  

#### .expsmooth()
Sample the beginning of a series and use it to predict what should happen

Argument | Accepts | Description
--- | --- | ---
alpha | *number* | The weight of the the smoothing component (between 0 and 1)  
beta | *number* | The weight of the trending component (between 0 and 1)  

#### .trend()
Draws a trend line using a specified regression algorithm

Argument | Accepts | Description
--- | --- | ---
mode | *string* | The algorithm to use for generating the trend line. One of: linear, log  
start | *number* | Where to start calculating from the beginning or end. For example -10 would start calculating 10 points from the end, +15 would start 15 points from the beginning. Default: 0  
end | *number* | Where to stop calculating from the beginning or end. For example -10 would stop calculating 10 points from the end, +15 would stop 15 points from the beginning. Default: 0  

