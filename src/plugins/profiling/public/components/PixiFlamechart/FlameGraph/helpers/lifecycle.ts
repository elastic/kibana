import { useEffect, RefObject } from 'react'
import { Viewport } from 'pixi-viewport'
import * as Pixi from 'pixi.js'

import { BitmapTextEllipse } from './BitmapTextEllipse';

/**
 *
 * @param canvas
 * @returns size of the canvas in use
 */
export const canvasSize = (canvas: HTMLDivElement) => {
  const paddingBottom = 20
  const { width: pixiWidth, y: pixiTopY } = canvas.getBoundingClientRect()

  return {
    width: pixiWidth,
    height: window.innerHeight - pixiTopY - paddingBottom,
  }
}

/**
 * clamp viewport so user can't drag outside of limits
 * @param viewport
 */
export const clamp = (viewport: Viewport) => {
  // minimum number of screen pixels of world to view
  const ClampMinimumPixels = 50

  const worldWidth = viewport.worldWidth
  const worldHeight = viewport.worldHeight
  const screenWidth = viewport.screenWidthInWorldPixels / 2.0
  const screenHeight = viewport.screenHeightInWorldPixels / 2.0
  const paddingX = ClampMinimumPixels / viewport.scale.x
  const paddingY = ClampMinimumPixels / viewport.scale.y

  viewport.clamp({
    left: -screenWidth + paddingX,
    right: worldWidth + screenWidth - paddingX,

    top: -screenHeight + paddingY,
    bottom: worldHeight + screenHeight - paddingY,

    underflow: 'none',
  })
}

/**
 * handles window resizes, making sure that the canvas and viewport adjust accordingly
 * a callback can be provided for further handling (e.g.: zoom / scale adjustements, culling, ...)
 * @param canvas
 * @param renderer
 * @param viewport
 * @param callback
 * @returns
 */
export const resize = (
  canvas: HTMLDivElement | null,
  renderer: Pixi.Renderer,
  viewport: Viewport,
  callback?: (viewport: Viewport, newWidth: number, newHeight: number) => void
) => {
  if (!canvas) {
    return
  }

  // keep the renderer and font in sync with changes to the zoom level
  if (renderer.resolution !== window.devicePixelRatio) {
    renderer.resolution = window.devicePixelRatio
    BitmapTextEllipse.init()
  }

  const { width: pixiWidth, height: pixiHeight } = canvasSize(canvas)

  renderer.resize(pixiWidth, pixiHeight)
  viewport.resize(pixiWidth, pixiHeight)

  callback?.(viewport, pixiWidth, pixiHeight)
}

/**
 * reset canvas & any  children that was drawn before. We use `useCallback` to avoid triggering
 * @param canvas
 * @param viewport
 * @param renderer
 * @returns
 */
export const resetPixi = (
  canvas: HTMLDivElement | null,
  viewport: Viewport,
  renderer: Pixi.Renderer
) => {
  if (!canvas) {
    return
  }

  if (canvas.hasChildNodes()) {
    viewport.removeChildren()
    canvas.removeChild(renderer.view)
  }
}

/**
 * handles resizes and sidebar changes, calling a callback when that happens
 * @param gameCanvasRef
 * @param renderer
 * @param viewport
 * @param windowWidth
 * @param sidebar
 * @param resize
 */
export const useResizeListenerEffect = (
  gameCanvasRef: RefObject<HTMLDivElement>,
  renderer: Pixi.Renderer,
  viewport: Viewport,
  windowWidth: number | undefined,
  sidebar: boolean | undefined,
  callback: (
    canvas: HTMLDivElement,
    renderer: Pixi.Renderer,
    viewport: Viewport
  ) => void) => {
  /**
   * handle window resizes
   */
  useEffect(() => {
    const canvas = gameCanvasRef.current

    if (!canvas) {
      return
    }

    callback(canvas, renderer, viewport)
  }, [gameCanvasRef, windowWidth, renderer, viewport, callback])

  /**
   * handle sidebar state changes
   * Hack: we can't get the size of the canvas until the animation finishes, hence the timeout
   * not the prettiest solution: if the sidebar animation duration changes we need to change here
   * as well.
   * We gave a bigger amount than the current sidebar animation duration to address future changes
   */
  useEffect(() => {
    const canvas = gameCanvasRef.current

    if (!canvas) {
      return
    }

    setTimeout(() => {
      callback(canvas, renderer, viewport)
    }, 500)
  }, [gameCanvasRef, sidebar, renderer, viewport, callback])
}