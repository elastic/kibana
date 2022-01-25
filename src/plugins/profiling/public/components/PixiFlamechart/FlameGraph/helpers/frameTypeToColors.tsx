/**
  Helper to calculate the color of a given block to be drawn. The desirable outcomes of this are:
  Each of the following frame types should get a different set of color hues:
    #define FRAME_MARKER_PYTHON        0x1
    #define FRAME_MARKER_PHP           0x2
    #define FRAME_MARKER_NATIVE        0x3
    #define FRAME_MARKER_KERNEL        0x4
    #define FRAME_MARKER_HOTSPOT       0x5
  This is most easily achieved by mapping frame types to different color variations, using
  the x-position we can use different colors for adjacent blocks while keeping a similar hue
*/
const frameTypeToColors = new Map([
  [
    0,
    {
      colors: [0xfd8484, 0xfd9d9d, 0xfeb5b5, 0xfecece],
      frame: "Unsymbolized Frame",
      mainHexColor: "#FD8484"
    }
  ], // Red
  [
    1,
    {
      colors: [0xfcae6b, 0xfdbe89, 0xfdcea6, 0xfedfc4],
      frame: "Python",
      mainHexColor: "#FCAE6B"
    }
  ], // Orange
  [
    2,
    {
      colors: [0xfcdb82, 0xfde29b, 0xfde9b4, 0xfef1cd],
      frame: "PHP",
      mainHexColor: "#FCDB82"
    }
  ], // Yellow
  [
    3,
    {
      colors: [0x6dd0dc, 0x8ad9e3, 0xa7e3ea, 0xc5ecf1],
      frame: "Native",
      mainHexColor: "#6DD0DC"
    }
  ], // Green
  [
    4,
    {
      colors: [0x7c9eff, 0x96b1ff, 0xb0c5ff, 0xcbd8ff],
      frame: "Kernel",
      mainHexColor: "#7C9EFF"
    }
  ], // Blue
  [
    5,
    {
      colors: [0x65d3ac, 0x84dcbd, 0xa3e5cd, 0xc1edde],
      frame: "JVM/Hotspot",
      mainHexColor: "#65D3AC"
    }
  ], // Light Green
  [
    6,
    {
      colors: [0xd79ffc, 0xdfb2fd, 0xe7c5fd, 0xefd9fe],
      frame: "Ruby",
      mainHexColor: "#D79FFC"
    }
  ], // Purple
  [
    7,
    {
      colors: [0xf98bb9, 0xfaa2c7, 0xfbb9d5, 0xfdd1e3],
      frame: "Perl",
      mainHexColor: "#F98BB9"
    }
  ], // Pink
  [
    8,
    {
      colors: [0xcbc3e3, 0xd5cfe8, 0xdfdbee, 0xeae7f3],
      frame: "JavaScript",
      mainHexColor: "#CBC3E3"
    }
  ] // Light Purple
]);

export { frameTypeToColors };
