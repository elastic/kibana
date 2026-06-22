/*
 * Copyright Elasticsearch B.V. and contributors
 * SPDX-License-Identifier: Apache-2.0
 */

const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'
const DIM = '\x1b[2m'

function rgb(r: number, g: number, b: number): string {
  return `\x1b[38;2;${r};${g};${b}m`
}

function color256(n: number): string {
  return `\x1b[38;5;${n}m`
}

type ColorLevel = 0 | 1 | 2 | 3

function isTTY(): boolean {
  const force = process.env.FORCE_COLOR
  return !!process.stdout.isTTY || (force !== undefined && force !== '0')
}

function detectColorLevel(): ColorLevel {
  if (process.env.NO_COLOR !== undefined) return 0
  if (process.env.COLORTERM === 'truecolor' || process.env.COLORTERM === '24bit') return 3
  if (process.env.TERM?.includes('256')) return 2
  return 1
}

// "elastic" in figlet standard font
const ELASTIC_ASCII = [
  '  _____ _           _   _      ',
  ' | ____| | __ _ ___| |_(_) ___ ',
  ' |  _| | |/ _` / __| __| |/ __|',
  ' | |___| | (_| \\__ \\ |_| | (__ ',
  ' |_____|_|\\__,_|___/\\__|_|\\___|',
]

// Elastic brand gradient: pink → yellow → teal → blue → light-blue
const PALETTE_TC = [
  rgb(240, 78, 152),   // #F04E98 Elastic Pink
  rgb(254, 197, 20),   // #FEC514 Elastic Yellow
  rgb(0, 191, 179),    // #00BFB3 Elastic Teal
  rgb(0, 119, 204),    // #0077CC Elastic Blue
  rgb(27, 169, 245),   // #1BA9F5 Elastic Light Blue
]

const PALETTE_256 = [205, 220, 43, 26, 39]

const PALETTE_ANSI = ['\x1b[95m', '\x1b[93m', '\x1b[96m', '\x1b[94m', '\x1b[36m']

export function renderLogo(version: string): string {
  if (process.env.ELASTIC_NO_BANNER === '1') return ''
  if (!isTTY()) return ''

  const level = detectColorLevel()

  if (level === 0) {
    return `\n  elastic CLI  ${version}\n\n`
  }

  const lines = ELASTIC_ASCII.map((line, i) => {
    const c =
      level === 3 ? PALETTE_TC[i]! :
      level === 2 ? color256(PALETTE_256[i]!) :
      PALETTE_ANSI[i]!
    const suffix = i === ELASTIC_ASCII.length - 1
      ? `  ${BOLD}CLI${RESET}  ${DIM}${version}${RESET}`
      : ''
    return `${c}${line}${RESET}${suffix}`
  })

  return `\n${lines.join('\n')}\n\n`
}
