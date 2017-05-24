import Circos from 'circos/dist/circos';

class CircosVisController {
  constructor(el) {
    this.el = el;
  }

  render(vis, visData) {
    this.vis = vis;
    this.visData = visData;
    if (this.circos) {
      this.destroy();
    }

    return new Promise(resolve => {
      const width = this.el.offsetWidth;
      const height = this.el.offsetHeight;
      const radius = Math.min(width, height) / 20;
      this.vis = vis;
      this.circos = new Circos({
        container: this.el,
        width: this.el.offsetWidth * 0.9,
        height: this.el.offsetHeight * 0.9,
      });

      this.circos.layout(visData.layout, {
        gap: vis.params.layout.gap,
        innerRadius: radius,
        outerRadius: radius,
        labels: {
          display: vis.params.layout.showLabels,
          radialOffset: vis.params.layout.offsetLabels
        },
        ticks: { display: true, labels: false }
      });

      visData.series.forEach((serie, i) => {
        const seriesParams = vis.params.seriesParams[i];
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
      resolve(true);
    });
  }

  resize() {
    if (!this.circos) return;
    this.render(this.vis, this.visData);
  }

  destroy() {
    if (this.circos) {
      this.el.innerHTML = '';
      this.circos = null;
    }
  }
}

export { CircosVisController };
