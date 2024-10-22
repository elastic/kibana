function(props) {
  const wrapperRef = React.useRef(null);
  // Based on this example:
  // https://observablehq.com/@vega/vega-lite-api

  // setup API options
  const options = {
    config: {
      // Vega-Lite default configuration
    },
    init: (view) => {
      // initialize tooltip handler
      view.tooltip(new vegaTooltip.Handler().call);

      view.addSignalListener('brushX', function(event, item) {
          if (item.monthdate_date) {
            props.dispatch(`WHERE @timestamp >= "${new Date(item.monthdate_date[0]).toISOString().replace('2012-', '2024-')}" AND @timestamp < "${new Date(item.monthdate_date[1]).toISOString().replace('2012-', '2024-')}"`);
          } else {
            props.dispatch('');
          }
        })
    },
    view: {
      renderer: "canvas",
    },
  };

  React.useEffect(() => {
    // register vega and vega-lite with the API
    vl.register(vega, vegaLite, options);

    const data = props.data;

    const brush = vl.selectInterval().name('brushX').encodings('x');

    // now you can use the API!
    const spec = vl.markBar({ tooltip: true })
      .data(data)
      .encode(
        // https://vega.github.io/vega-lite/docs/timeunit.html
        vl.x().timeMD('date').axis({title: 'Date'}),
        vl.y().sum("count"),
        vl.tooltip([vl.fieldT("date"), vl.fieldQ("count")])
      )
      .width(props.width)
      .height(props.height)
      .autosize({ type: 'fit-x'})
      .params(brush)

      spec.render()
      .then((viewElement) => {
        // render returns a promise to a DOM element containing the chart
        // viewElement.value contains the Vega View object instance
        const el = wrapperRef.current;
        while (el.firstChild) el.removeChild(el.firstChild);
        wrapperRef.current.appendChild(viewElement);
      });
    },
    [props.data, props.width, props.height]
  );

  return <div ref={wrapperRef} id="myChart" style={{
    width: "100%",
    height: "100%",
  }}></div>;
}
