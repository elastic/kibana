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

      view.addEventListener('click', function(event, item) {
          // event is the event listener
          // item is the active scenegraph
        console.log('CLICK', event, item);
      });


      view.addSignalListener('brushX', function(event, item) {
          console.log('signal', event ,item);
          if (item.monthdate_date) {
            props.dispatch(`WHERE @timestamp >= ${item.monthdate_date[0]} AND @timestamp < ${item.monthdate_date[1]}`);
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

    const data = props.data.values.map((d) => ({
      date: d[1],
      count: d[0]
    }));

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
      .params(brush)

      spec.render()
      .then((viewElement) => {
        console.log('other', null);
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
