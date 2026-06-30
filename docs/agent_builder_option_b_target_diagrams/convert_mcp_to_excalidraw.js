/*
 * Converts simplified MCP Excalidraw elements to full .excalidraw format.
 * Usage: node convert_mcp_to_excalidraw.js input.json output.excalidraw
 */

const fs = require('fs');

const FONT_FAMILY = 1; // Virgil
let seedCounter = 1000;

const defaults = {
  angle: 0,
  strokeColor: '#1e1e1e',
  backgroundColor: 'transparent',
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  groupIds: [],
  frameId: null,
  boundElements: [],
  link: null,
  locked: false,
  isDeleted: false,
  version: 1,
};

function nextSeed() {
  seedCounter += 1;
  return seedCounter;
}

function estimateTextSize(text, fontSize) {
  const lines = String(text).split('\n');
  const maxLen = Math.max(...lines.map((l) => l.length));
  return {
    width: Math.max(maxLen * fontSize * 0.55, 20),
    height: Math.max(lines.length * fontSize * 1.25, fontSize),
  };
}

function bindingPoint(shape, fixedPoint = [0.5, 0.5]) {
  if (!shape) {
    return null;
  }
  return [shape.x + shape.width * fixedPoint[0], shape.y + shape.height * fixedPoint[1]];
}

function getAbsoluteArrowPoints(el, shapeMap) {
  const abs = el.points.map(([px, py]) => [el.x + px, el.y + py]);

  if (el.startBinding?.elementId) {
    const start = bindingPoint(shapeMap[el.startBinding.elementId], el.startBinding.fixedPoint);
    if (start) {
      abs[0] = start;
    }
  }

  if (el.endBinding?.elementId) {
    const end = bindingPoint(
      shapeMap[el.endBinding.elementId],
      el.endBinding.fixedPoint ?? [0.5, 0.5]
    );
    if (end) {
      abs[abs.length - 1] = end;
    }
  }

  return abs;
}

function normalizeArrowGeometry(absPoints) {
  const xs = absPoints.map(([x]) => x);
  const ys = absPoints.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: absPoints.map(([ax, ay]) => [ax - minX, ay - minY]),
  };
}

function makeText(id, x, y, text, fontSize, opts = {}) {
  const size = estimateTextSize(text, fontSize);
  return {
    ...defaults,
    type: 'text',
    id,
    x,
    y,
    width: size.width,
    height: size.height,
    text,
    fontSize,
    fontFamily: FONT_FAMILY,
    textAlign: opts.textAlign ?? 'center',
    verticalAlign: opts.verticalAlign ?? 'middle',
    containerId: opts.containerId ?? null,
    originalText: text,
    lineHeight: 1.25,
    roundness: null,
    versionNonce: nextSeed(),
    seed: nextSeed(),
    updated: Date.now(),
    ...opts,
  };
}

function makeShape(el) {
  const { type, id, x, y, width, height } = el;
  const shape = {
    ...defaults,
    type,
    id,
    x,
    y,
    width,
    height,
    roundness:
      el.roundness ??
      (type === 'rectangle' ? { type: 3 } : type === 'ellipse' ? { type: 2 } : null),
    backgroundColor: el.backgroundColor ?? defaults.backgroundColor,
    fillStyle: el.fillStyle ?? defaults.fillStyle,
    strokeColor: el.strokeColor ?? defaults.strokeColor,
    strokeWidth: el.strokeWidth ?? defaults.strokeWidth,
    strokeStyle: el.strokeStyle ?? defaults.strokeStyle,
    opacity: el.opacity ?? defaults.opacity,
    versionNonce: nextSeed(),
    seed: nextSeed(),
    updated: Date.now(),
  };

  if (el.label?.text) {
    const textId = `${id}_label`;
    const fontSize = el.label.fontSize ?? 16;
    const textEl = makeText(textId, x, y, el.label.text, fontSize, {
      containerId: id,
      textAlign: 'center',
      verticalAlign: 'middle',
    });
    shape.boundElements = [{ type: 'text', id: textId }];
    return [shape, textEl];
  }

  return [shape];
}

function makeArrow(el, shapeMap) {
  const absPoints = getAbsoluteArrowPoints(el, shapeMap);
  const geometry = normalizeArrowGeometry(absPoints);
  const midIndex = Math.floor(absPoints.length / 2);
  const midPoint = absPoints[midIndex] ?? absPoints[0];

  const arrow = {
    ...defaults,
    type: 'arrow',
    id: el.id,
    x: geometry.x,
    y: geometry.y,
    width: geometry.width,
    height: geometry.height,
    points: geometry.points,
    roundness: { type: 2 },
    strokeColor: el.strokeColor ?? defaults.strokeColor,
    strokeWidth: el.strokeWidth ?? defaults.strokeWidth,
    strokeStyle: el.strokeStyle ?? defaults.strokeStyle,
    endArrowhead: el.endArrowhead === undefined ? 'arrow' : el.endArrowhead,
    startArrowhead: el.startArrowhead ?? null,
    startBinding: null,
    endBinding: null,
    lastCommittedPoint: geometry.points[geometry.points.length - 1],
    versionNonce: nextSeed(),
    seed: nextSeed(),
    updated: Date.now(),
  };

  const out = [arrow];

  if (el.label?.text) {
    const textId = `${el.id}_label`;
    const fontSize = el.label.fontSize ?? 14;
    const size = estimateTextSize(el.label.text, fontSize);
    out.push(
      makeText(textId, midPoint[0] - size.width / 2, midPoint[1] - size.height / 2, el.label.text, fontSize, {
        containerId: el.id,
        textAlign: 'center',
        verticalAlign: 'middle',
      })
    );
    arrow.boundElements = [{ type: 'text', id: textId }];
  }

  return out;
}

function buildShapeMap(mcpElements) {
  const shapeMap = {};
  for (const el of mcpElements) {
    if (['rectangle', 'ellipse', 'diamond'].includes(el.type)) {
      shapeMap[el.id] = el;
    }
  }
  return shapeMap;
}

function convertElements(mcpElements) {
  const shapeMap = buildShapeMap(mcpElements);
  const elements = [];

  for (const el of mcpElements) {
    if (el.type === 'cameraUpdate') {
      continue;
    }

    if (el.type === 'text') {
      elements.push(
        makeText(el.id, el.x, el.y, el.text, el.fontSize ?? 16, {
          strokeColor: el.strokeColor ?? defaults.strokeColor,
          textAlign: 'left',
          verticalAlign: 'top',
        })
      );
      continue;
    }

    if (el.type === 'arrow') {
      elements.push(...makeArrow(el, shapeMap));
      continue;
    }

    if (['rectangle', 'ellipse', 'diamond'].includes(el.type)) {
      elements.push(...makeShape(el));
    }
  }

  return elements;
}

function main() {
  const [, , inputPath, outputPath] = process.argv;
  if (!inputPath || !outputPath) {
    console.error('Usage: node convert_mcp_to_excalidraw.js input.json output.excalidraw');
    process.exit(1);
  }

  seedCounter = 1000;
  const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const mcpElements = data.elements ?? data;
  const elements = convertElements(mcpElements);

  const excalidraw = {
    type: 'excalidraw',
    version: 2,
    source: 'https://excalidraw.com',
    elements,
    appState: {
      viewBackgroundColor: '#ffffff',
      gridSize: null,
    },
    files: {},
  };

  fs.writeFileSync(outputPath, JSON.stringify(excalidraw, null, 2));
  console.log(`Wrote ${elements.length} elements to ${outputPath}`);
}

main();
