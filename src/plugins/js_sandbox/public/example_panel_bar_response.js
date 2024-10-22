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

      view.addSignalListener('response', function(event, item) {
          console.log('item',item);
          if (item.response) {
            props.dispatch(`WHERE response == "${item.response[0]}"`);
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

    const data = [
      ...props.data.map((d,i) => ({
        ...d,
        count: d.count - (props.crossfilter.find(d2 => d2.response === d.response)?.count ?? 0),
        type: '02_context'
      })),
      ...props.crossfilter.map(d => ({
        ...d,
        type: '01_filter'
      }))
      ];
    console.log('data response code',data);

    const click = vl.selectPoint().encodings('y').name('response');

    // now you can use the API!
    const spec = vl.markBar({ tooltip: true })
      .data(data)
      .encode(
        // https://vega.github.io/vega-lite/docs/timeunit.html
        vl.x().sum("count"),
        vl.y().fieldN('response'),
        vl.color().fieldN('type').scale({ range: ['#386cb0', '#999'] }).legend({disable: true}),
        vl.tooltip([vl.fieldN("response"), vl.fieldQ("count")])
      )
      .width(props.width)
      .height(props.height)
      .autosize({ type: 'fit-x'})
      .params(click)

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
