## Timelion function reference
This is the timelion function reference. Please note this document is auto generated from the Timelion code. Do not submit pulls against this document. You want to submit a pull against something in the `series_functions/` directory.

### Data sources
#### .es()
Pull data from an elasticsearch instance

Argument | Accepts | Description
--- | --- | ---
q | *string* | Query in lucene query string syntax  
metric | *string* | An elasticsearch single value metric agg, eg avg, sum, min, max or cardinality, followed by a field. Eg "sum:bytes"  
index | *string* | Index to query, wildcards accepted  
timefield | *string* | Field of type "date" to use for x-axis  
interval | *string* | **DO NOT USE THIS**. Its fun for debugging fit functions, but you really should use the interval picker  
url | *string* | Elasticsearch server URL, eg http://localhost:9200  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .graphite()
Pull data from grahite. Configure your graphite server in timelion.json

Argument | Accepts | Description
--- | --- | ---
metric | *string* | Graphite metric to pull, eg _test-data.users.*.data  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .quandl()
Pull data from quandl.com using the quandl code. Stick your free API key in timelion.json. API is rate limited without a key

Argument | Accepts | Description
--- | --- | ---
code | *string* | The quandl code to plot. You can find these on quandl.com.  
position | *number* | Some quandl sources return multiple series, which one should I use? 1 based index.  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .worldbank_indicators()
Pull data from http://data.worldbank.org/ using the country name and indicator. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

Argument | Accepts | Description
--- | --- | ---
country | *string* | Worldbank country identifier. Usually the country's 2 letter code  
indicator | *string* | The indicator code to use. You'll have to look this up on data.worldbank.org. Often pretty obtuse. Eg SP.POP.TOTL is population  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

#### .worldbank()
Pull data from http://data.worldbank.org/ using path to series. The worldbank provides mostly yearly data, and often has no data for the current year. Try offset=-1y if you get no data for recent time ranges.

Argument | Accepts | Description
--- | --- | ---
code | *string* | Worldbank API path. This is usually everything after the domain, before the querystring. Eg: /en/countries/ind;chn/indicators/DPANUSSPF.  
offset | *string* | Offset the series retrieval by a date expression. Eg -1M to make events from one month ago appear as if they are happening now  
fit | *string* | Algorithm to use for fitting series to the target time span and interval. Available: average, nearest, none, scale  

### Chainable functions
#### .abs()
Return the absolute value of each value in the series list

*This function does not accept any arguments.*

#### .bars()
Show the seriesList as bars

Argument | Accepts | Description
--- | --- | ---
width | *number* | Width of bars in pixels  

#### .color()
Change the color of the series

Argument | Accepts | Description
--- | --- | ---
color | *string* | Color of series, as hex, eg #c6c6c6 is a lovely light grey.  

#### .cusum()
Return the cumulative sum of a series, starting at a base.

Argument | Accepts | Description
--- | --- | ---
base | *number* | Number to start at. Basically just adds this to the beginning of the series  

#### .derivative()
Show the seriesList as bars

*This function does not accept any arguments.*

#### .divide()
Divides the values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
divisor | *seriesList/number* | Number or series to divide by. If passing a seriesList it must contain exactly 1 series.  

#### .first()
This is an internal function that simply returns the input seriesList. Don't use this

*This function does not accept any arguments.*

#### .hide()
Hide the series by default

Argument | Accepts | Description
--- | --- | ---
hide | *boolean* | Hide or unhide the series  

#### .label()
Change the label of the series. Use %s reference the existing label

Argument | Accepts | Description
--- | --- | ---
label | *string* | Legend value for series. You can use %s to reference to current label.  

#### .legend()
Set the position and style of the legend on the plot

Argument | Accepts | Description
--- | --- | ---
position | *string* | Corner to place the legend in: nw, ne, se, or sw  
columns | *number* | Number of columns to divide the legend into  

#### .lines()
Show the seriesList as lines

Argument | Accepts | Description
--- | --- | ---
width | *number* | Line thickness  
fill | *number* | Number between 0 and 10. Use for making area charts  
show | *number* | Show or hide lines  
steps | *number* | Show line as step, eg, do not interpolate between points  

#### .max()
Maximum values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
value | *seriesList/number* | Number, series to max with the input series. If passing a seriesList it must contain exactly 1 series.  

#### .min()
Minimum values of one or more series in a seriesList to each position, in each series, of the input seriesList

Argument | Accepts | Description
--- | --- | ---
value | *seriesList/number* | Number, series to min with the input series. If passing a seriesList it must contain exactly 1 series.  

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

#### .testcast()
Use holt-winters to forecast values. Basically useless. I have no idea how this works.

Argument | Accepts | Description
--- | --- | ---
count | *number* | *no help available*  
alpha | *number* | *no help available*  
beta | *number* | *no help available*  
gamma | *number* | *no help available*  

#### .yaxis()
This is an internal function that simply returns the input series. Don't use this

Argument | Accepts | Description
--- | --- | ---
yaxis | *number* | The numbered y-axis to plot this series on, eg .yaxis(2) for a 2nd y-axis.  
min | *number* | Min value  
max | *number* | Max value  
position | *string* | left or right  

