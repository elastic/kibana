export default function roundToNearestSecond(value, precision, dir) {
  precision *= 1000;
  value = Math[dir](value / precision) * precision;
  return value;
}
