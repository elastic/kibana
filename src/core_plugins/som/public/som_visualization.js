import TableFromTabified from './TableFromTabified';

const template  = require('./app_template.html');

class SomVisualization {
  constructor(el) {

    this.el = el;

    this._somApp = null;
    this._somHolder = document.createElement('div');
    this._somHolder.setAttribute('class', 'somMap');

    console.log(template);
    this._somHolder.innerHTML = template;

    this.el.appendChild(this._somHolder);

  }

  render(vis, visData) {


    console.log(visData);

    return new Promise(resolve => {


      if (this._somApp) {
        this._somApp.destroy();
        this._somApp = null;
      }

      if (vis.aggs.length === 1) {
        console.log('must have more configs');
        this._somHolder.innerHTML = '';
        return;
      }

      let tableFromTab;
      try {
        tableFromTab = new TableFromTabified(visData, vis.aggs);
        console.log('table', tableFromTab);
      } catch (e) {
        console.error(e);
        this._somHolder.innerHTML = '';
        return;
      }

      this._somHolder.innerHTML = template;
      this._somApp = window.PONDER.createSOM({
        table: tableFromTab,
        nodes: {
          toolbar: "mapToolContainer",
          mapTableToggle: "toggle",
          table: "tableContainer",
          map: "map",
          toggleToMap: "toggle-to-map",
          toggleToTable: "toggle-to-table",
          container: this._somHolder,
          center: "center",
          waiting: "waiting"
        },
        bmu: {
          initialColumn: null //?bwerugh?
        }
      });
      this._somApp.on("AppLoaded", function () {
        console.log('loaded');
      });


      console.log('rendering visualization');
      resolve('when done rendering');
    });
  }

  resize() {
    console.log('resizing visualization');
    if (this._somApp) {
      this._somApp.fit();
    }
  }

  destroy() {
    if (this._somApp) {
      this._somApp.destroy()
    }

    this.el.innerHTML = '';


  }
}

export {SomVisualization};
