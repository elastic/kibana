# `expressions` plugin

This plugin provides methods which will parse & execute an *expression pipeline*
string for you, as well as a series of registries for advanced users who might
want to incorporate their own functions, types, and renderers into the service
for use in their own application.

Expression pipeline is a chain of functions that *pipe* its output to the
input of the next function. Functions can be configured using arguments provided
by the user. The final output of the expression pipeline can be rendered using
one of the *renderers* registered in `expressions` plugin.

Expressions power visualizations in Dashboard and Lens, as well as, every
*element* in Canvas is backed by an expression.

Below is an example of one Canvas element that fetches data using `essql` function,
pipes it further to `math` and `metric` functions, and final `render` function
renders the result.

```
filters
| essql
  query="SELECT COUNT(timestamp) as total_errors
    FROM kibana_sample_data_logs
    WHERE tags LIKE '%warning%' OR tags LIKE '%error%'"
| math "total_errors"
| metric "TOTAL ISSUES"
  metricFont={font family="'Open Sans', Helvetica, Arial, sans-serif" size=48 align="left" color="#FFFFFF" weight="normal" underline=false italic=false}
  labelFont={font family="'Open Sans', Helvetica, Arial, sans-serif" size=30 align="left" color="#FFFFFF" weight="lighter" underline=false italic=false}
| render
```

![image](https://user-images.githubusercontent.com/9773803/74162514-3250a880-4c21-11ea-9e68-86f66862a183.png)

[See Canvas documentation about expressions](https://www.elastic.co/guide/en/kibana/current/canvas-function-arguments.html).
