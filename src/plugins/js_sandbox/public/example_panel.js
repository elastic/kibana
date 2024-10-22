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
    },
    view: {
      renderer: "canvas",
    },
  };

  React.useEffect(() => {
    // register vega and vega-lite with the API
    vl.register(vega, vegaLite, options);

    const data = props.data.values.map((d) => ({
      x: d[1],
      y: d[0]
    }));

    // now you can use the API!
    vl.markBar({ tooltip: true })
      .data(data)
      .encode(
        vl.x().fieldT("x"),
        vl.y().fieldQ("y"),
        vl.tooltip([vl.fieldT("x"), vl.fieldQ("y")])
      )
      .width("800")
      .render()
      .then(viewElement => {
        // render returns a promise to a DOM element containing the chart
        // viewElement.value contains the Vega View object instance
        wrapperRef.current.innerHtml = '';
        wrapperRef.current.appendChild(viewElement);
      });
    },
    [props.data]
  );

  return <div ref={wrapperRef} id="myChart" style={{
    width: "100%",
    height: "100%",
  }}></div>;
}
