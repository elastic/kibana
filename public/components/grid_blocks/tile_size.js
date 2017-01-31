// Ported from https://stackoverflow.com/questions/868997/max-square-size-for-unknown-number-inside-rectangle

export default function tileSize(width, height, tileCount) {
  // False, you fed us garbage
  if (width * height < tileCount) { return 0; }

  // A hypothesis
  var aspect = height / width;
  var xf = Math.sqrt(tileCount / aspect);
  var yf = xf * aspect;
  var x = Math.max(1, Math.floor(xf));
  var y = Math.max(1, Math.floor(yf));
  var xSize = Math.floor(width / x);
  var ySize = Math.floor(height / y);
  var tileSize = Math.min(xSize, ySize);

  // Test said hypothesis
  x = Math.floor(width / tileSize);
  y = Math.floor(height / tileSize);

  if (x * y < tileCount) { // Hypothesis was too high
    if (((x + 1) * y < tileCount) && (x * (y + 1) < tileCount)) {
      //case 2: the upper bound is correct, compute the tileSize that will, result in (x+1)*(y+1) tiles
      xSize = Math.floor(width / (x + 1));
      ySize = Math.floor(height / (y + 1));
      tileSize = Math.min(xSize, ySize);
    } else {
      // case 3: solve an equation to determine the final x and y dimensions and then compute the tileSize that results in those dimensions
      var testX = Math.ceil(tileCount / y);
      var testY = Math.ceil(tileCount / x);
      xSize = Math.min(Math.floor(width / testX), Math.floor(height / y));
      ySize = Math.min(Math.floor(width / x), Math.floor(height / testY));
      tileSize = Math.max(xSize, ySize);
    }
  }

  return tileSize; // Hypothesis was correct. Score.
};
