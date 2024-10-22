function(props) {
  const [initalized, setInitialized] = React.useState(false);
  const wrapperRef = React.useRef(null);
  const vegaRef = React.useRef(null);
  // Based on this example:
  // https://observablehq.com/@vega/vega-lite-api

  const data = React.useMemo(() => {
    const data = [
      ...props.data.map((d, i) => ({
        ...d,
        count: d.count - (props.crossfilter.find(d2 => d2.response === d.response)?.count ?? 0),
        type: '02_context'
      })),
      ...props.crossfilter.map(d => ({
        ...d,
        type: '01_filter'
      }))
    ];
    console.log('data response code', data);
    return data;
  }, [props.data, props.crossfilter]);

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      console.log('---- data change', view)
      view.data('table', data).run();
    }
  }, [data, initalized]);
  console.log('vegaRef.current',vegaRef.current)

  React.useEffect(() => {
    if (vegaRef.current) {
      const view = vegaRef.current;
      view.width(props.width);
      view.height(props.height);
    }
  }, [props.width, props.height, initalized])

  React.useEffect(() => {
    // setup API options
    const options = {
      config: {
        // Vega-Lite default configuration
      },
      init: (view) => {
        vegaRef.current = view;
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

        setInitialized(true);
      },
      view: {
        renderer: "canvas",
      },
    };
    // register vega and vega-lite with the API
    vl.register(vega, vegaLite, options);

    const click = vl.selectMulti().encodings('y').name('response');

    // now you can use the API!
    const spec = vl.markBar({ tooltip: true })
      .data({ name: 'table'})
      .encode(
        // https://vega.github.io/vega-lite/docs/timeunit.html
        vl.x().sum("count"),
        vl.y().fieldN('response'),
        vl.color().fieldN('type').scale({ range: ['steelblue', 'lightgrey'] }).legend({disable: true}),
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
    []
  );

  return <div ref={wrapperRef} id="myChart" style={{
    width: "100%",
    height: "100%",
  }}></div>;
}
