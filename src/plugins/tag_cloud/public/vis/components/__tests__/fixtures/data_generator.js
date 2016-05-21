export default function (num) {
  return Array.apply(null, new Array(num))
    .map(function (val, i) {
      return {
        x: +(Math.random() * 100).toFixed(0),
        y: +(Math.random() * 100).toFixed(0)
      };
    });
};
