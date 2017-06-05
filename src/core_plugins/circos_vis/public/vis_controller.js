import Circos from 'circos';

class CircosVisController {
  constructor(el, vis) {
    this.el = el;
    this._vis = vis;
  }

  render(visData) {

    this.visData = visData;
    if (this.circos) {
      this.destroy();
    }


    const width = this.el.offsetWidth;
    const height = this.el.offsetHeight;
    const radius = Math.min(width, height) / 20;

    this.circos = new Circos({
      container: this.el,
      width: this.el.offsetWidth * 0.9,
      height: this.el.offsetHeight * 0.9,
    });

    this.circos.layout(visData.layout, {
      gap: this._vis.params.layout.gap,
      innerRadius: radius,
      outerRadius: radius,
      labels: {
        display: this._vis.params.layout.showLabels,
        radialOffset: this._vis.params.layout.offsetLabels
      },
      ticks: { display: true, labels: false }
    });

    visData.series.forEach((serie, i) => {
      const seriesParams = this._vis.params.seriesParams[i];
      this.circos[seriesParams.type](`series-${i}`, serie, {
        innerRadius: seriesParams.innerRadius,
        outerRadius: seriesParams.outerRadius,
        color: seriesParams.colorSchema,
        tooltipContent: (datum) => {
          return datum.value;
        }
      });
    });

    this.circos.render();


  }

  resize() {
    if (!this.circos) return;
    this.render(this.visData);
  }

  destroy() {
    if (this.circos) {
      this.el.innerHTML = '';
      this.circos = null;
    }
  }
}

export { CircosVisController };
