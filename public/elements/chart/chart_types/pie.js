import _ from 'lodash';
import $ from 'jquery';

export const pie = (elem, args) => {

  if (!args.aggregate_with || !args.value_column) return;

  // Data manipulation

  let valueObj;
  if (args.group_by) {
    valueObj = args.dataframe.aggregate.by(args.group_by)[args.aggregate_with](args.value_column);
  } else {
    valueObj = args.dataframe.aggregate[args.aggregate_with](args.value_column);
  };

  var data = _.map(valueObj, (value, label) => {
    return {
      label: label,
      data: value,
      //color: series.color
    };
  });

  // Flot setup

  let strokeWidth;
  let strokeColor;
  try {
    const strokeParts = args.stroke.border.match(/([0-9]+)px [a-z]+ (.*)/);
    strokeWidth = strokeParts[1];
    strokeColor = strokeParts[2];
  } catch (e) {
    console.log(e);
  }

  const flotConfig = {
    series: {
      pie: {
        show: true,
        stroke: {
          width: strokeWidth,
          color: strokeColor,
        },
        //startAngle: (args.start_angle || 0) * (Math.PI / 180),
        label: {
          show: true,
          formatter: (label, slice) => `
            <div>
              <div class="rework--circle-label">
                <span class="rework--circle-label-text">${label}</span>
                <i class="fa fa-circle rework--circle-label-color" style="color: ${slice.color}"></i>
              </div>
              <div class="rework--circle-value">${slice.data[0][1]}</div>
            </div>
          `
        }
      }
    },
    grid: {
      show: false,
    },
    legend: {
      show: false
    },
    colors: args.theme(data.length)
  };

  // Draw chart

  if (!data.length) return;
  $.plot($(elem), data, flotConfig);

};
