import * as Pixi from 'pixi.js'

const ELLIPSE = '...'
const SAMPLE_CHAR = 'X'
const NORMAL = 'LabelFont'
const BOLD = 'LabelFontBold'
export class BitmapTextEllipse extends Pixi.BitmapText {
  private static charWidth: number
  private static charWidthBold: number
  private originalText: string
  private _bold: boolean

  static init() {

    const commonFontDefinition = {
      fill: '#222222',
      fontSize: 11,
      fontFamily: 'monospace',
    }

    const fontOptions = {
      chars: Pixi.BitmapFont.ASCII,
      resolution: window.devicePixelRatio,
    }

    // Generate bitmap font
    Pixi.BitmapFont.from(
      NORMAL,
      {
        ...commonFontDefinition,
        fontWeight: 'normal',
      },
      fontOptions
    )

    Pixi.BitmapFont.from(
      BOLD,
      {
        ...commonFontDefinition,
        fontWeight: 'bold'
      },
      fontOptions
    )

    const sample = new Pixi.BitmapText(SAMPLE_CHAR, { fontName: NORMAL })
    BitmapTextEllipse.charWidth = sample.width
    const bold = new Pixi.BitmapText(SAMPLE_CHAR, { fontName: BOLD })
    BitmapTextEllipse.charWidthBold = bold.width
  }

  /**
   * This a cull-able BitmapSprite where an ellipse is added if individual letters are culled
   * @param text - string to render
   * @param style - font style
   */
  constructor(text: string) {
    super('', { fontName: NORMAL })
    this.originalText = text
    this._bold = false
  }

  get bold() {
    return this._bold
  }
  set bold(value: boolean) {
    if (this._bold !== value) {
      this._bold = value
      this.fontName = value ? BOLD : NORMAL
    }
  }

  /**
   * culls letters that do not fit; adds ellipse at end of text block
   * @param width - width of containing box in text coordinates
   */
  cull(width: number) {
    const charWidth = this.bold ? BitmapTextEllipse.charWidthBold : BitmapTextEllipse.charWidth

    if (width <= charWidth * (ELLIPSE.length + 1)) {
      this.visible = false
    } else {
      this.visible = true
      const characters = Math.floor(width / charWidth)

      if (characters > this.originalText.length) {
        this.text = this.originalText
      } else {
        this.text = this.originalText.substr(0, characters - ELLIPSE.length) + ELLIPSE
      }
    }

    /**
     * forces the redraw of the text
     * without this on browser zoom update some texts would disappear
     */
    this.dirty = true
  }
}