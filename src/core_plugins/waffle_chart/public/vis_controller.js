import d3 from 'd3';

class VisController {
  constructor(el) {
    this._container = el;
    this._waffleContainer = document.createElement('div');
    this._waffleContainer.setAttribute('class', 'waffle-waffle');
    this._legendContainer = document.createElement('div');
    this._legendContainer.setAttribute('class', 'waffle-legend');
    this._container.appendChild(this._waffleContainer);
    this._container.appendChild(this._legendContainer);
  }

  render(vis, visData) {

    return new Promise((resolve) => {

      this._clear();


      try {
        const label = vis.aggs[0].makeLabel() + ': ' +  vis.aggs[1].makeLabel();
        const data = convertResponse(visData);
        this._createWaffleVis(data, label);
      } catch (e) {
        //handle error
      }
      resolve(true);
    });
  }

  _clear() {
    d3.select(this._waffleContainer).selectAll('*').remove();
    d3.select(this._legendContainer).selectAll('*').remove();
  }

  _createWaffleVis(data, label) {
//copy pasted from http://bl.ocks.org/XavierGimenez/8070956
    const widthSquares = 20;
    const heightSquares = 5;
    const squareSize = 25;
    let squareValue = 0;
    const gap = 1;
    let theData = [];

    const color = d3.scale.category10();

    //total
    const total = d3.sum(data, function (d) {
      return d.value;
    });

    //value of a square
    squareValue = total / (widthSquares * heightSquares);

    //remap data
    data.forEach(function (d, i) {
      d.value = +d.value;
      d.units = Math.floor(d.value / squareValue);
      theData = theData.concat(
        new Array(d.units + 1).join(1).split('').map(function () {
          return {
            squareValue: squareValue,
            units: d.units,
            value: d.value,
            groupIndex: i
          };
        })
      );
    });

    const width = (squareSize * widthSquares) + widthSquares * gap + 25;
    const height = (squareSize * heightSquares) + heightSquares * gap + 25;

    let col;
    let row;
    d3.select(this._waffleContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .selectAll('div')
      .data(theData)
      .enter()
      .append('rect')
      .attr('width', squareSize)
      .attr('height', squareSize)
      .attr('fill', function (d) {
        return color(d.groupIndex);
      })
      .attr('x', function (d, i) {
        //group n squares for column
        col = Math.floor(i / heightSquares);
        return (col * squareSize) + (col * gap);
      })
      .attr('y', function (d, i) {
        row = i % heightSquares;
        return (heightSquares * squareSize) - ((row * squareSize) + (row * gap));
      })
      .append('title')
      .text(function (d) {
        return label +  ' ' + data[d.groupIndex].key + ' | ' + d.value + ' , ' + d.units + '%';
      });

    //add legend with categorical data
    const legend = d3.select(this._legendContainer)
      .append('svg')
      .attr('width', 300)
      .attr('height', 200)
      .append('g')
      .selectAll('div')
      .data(data)
      .enter()
      .append('g')
      .attr('transform', function (d, i) {
        return 'translate(0,' + i * 20 + ')';
      });
    legend.append('rect')
      .attr('width', 18)
      .attr('height', 18)
      .style('fill', function (d, i) {
        return color(i);
      });
    legend.append('text')
      .attr('x', 25)
      .attr('y', 13)
      .text(function (d) {
        return d.key;
      });

    //add value of a unit square
    const legend2 = d3.select('#legend')
      .select('svg')
      .append('g')
      .attr('transform', 'translate(100,0)');

    legend2.append('text')
      .attr('y', '14')
      .attr('font-size', '18px')
      .text('Total: ' + total)
      .attr('fill', '#444444');

  }

  resize() {
    console.log('resizing visualization');
  }

  destroy() {
    this._clear();
    this._container.innerHTML = '';
  }
}

function convertResponse(esResponse) {
  const data = [];
  for (let i = 0; i < esResponse.rows.length; i += 1) {
    if (esResponse.rows[i].rows[0] && esResponse.rows[i].rows[0][0]) {
      data.push({
        key: esResponse.rows[i].rows[0][0].$parent.value,
        value: esResponse.rows[i].rows[0][0].value
      });
    }
  }
  return data;
}


export { VisController };
